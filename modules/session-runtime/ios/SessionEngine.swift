import AVFoundation
import AudioToolbox
import CallKit
import Foundation
import HealthKit
import UIKit

struct Cue {
  let atMs: Double
  let text: String
}

struct Segment {
  let label: String
  let durationMs: Double
}

// Owns session time and cues. Elapsed time comes from a monotonic clock that
// keeps counting while the device sleeps, minus paused time; ticks only decide
// when to check it.
final class SessionEngine: NSObject, AVSpeechSynthesizerDelegate, CXCallObserverDelegate {
  static let shared = SessionEngine()

  var onChange: (([String: Any]) -> Void)?

  private(set) var status = "idle"
  private var sessionKey: String?
  private var segments: [Segment] = []
  private var cues: [Cue] = []
  private var speech = true
  private var vibration = true
  private var totalMs: Double = 0
  private var startedAt: Double = 0
  private var pausedTotal: Double = 0
  private var pausedAt: Double?
  private var pausedBy: String?
  private var lastCue = -1
  private var finalElapsed: Double?
  private var backgroundCapable = false

  private var timer: DispatchSourceTimer?
  private let synthesizer = AVSpeechSynthesizer()
  private let callObserver = CXCallObserver()
  private let healthStore = HKHealthStore()
  // A WorkoutKeeper on iOS 26+, where iPhone workout sessions exist.
  private var keeper: AnyObject?

  override init() {
    super.init()
    synthesizer.delegate = self
    synthesizer.usesApplicationAudioSession = true
    callObserver.setDelegate(self, queue: .main)
  }

  private static func now() -> Double {
    Double(clock_gettime_nsec_np(CLOCK_MONOTONIC)) / 1_000_000
  }

  // MARK: Background capability

  func prepare(completion: @escaping (Bool) -> Void) {
    guard #available(iOS 26.0, *), HKHealthStore.isHealthDataAvailable() else {
      completion(false)
      return
    }
    let workoutType = HKObjectType.workoutType()
    healthStore.requestAuthorization(toShare: [workoutType], read: []) { _, _ in
      DispatchQueue.main.async {
        completion(self.healthStore.authorizationStatus(for: workoutType) == .sharingAuthorized)
      }
    }
  }

  private func beginBackground() {
    backgroundCapable = false
    if #available(iOS 26.0, *), HKHealthStore.isHealthDataAvailable(),
      healthStore.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized,
      let workout = WorkoutKeeper(healthStore: healthStore, onFailure: { [weak self] in
        self?.workoutFailed()
      })
    {
      keeper = workout
      backgroundCapable = true
    }
    // Without a workout session iOS suspends the app when the screen locks,
    // so keep the screen on instead.
    UIApplication.shared.isIdleTimerDisabled = !backgroundCapable
  }

  private func endBackground() {
    if #available(iOS 26.0, *), let workout = keeper as? WorkoutKeeper {
      workout.end()
    }
    keeper = nil
    UIApplication.shared.isIdleTimerDisabled = false
  }

  private func workoutFailed() {
    keeper = nil
    backgroundCapable = false
    if status == "running" || status == "paused" {
      UIApplication.shared.isIdleTimerDisabled = true
    }
    emit()
  }

  // MARK: Commands

  func start(
    sessionKey: String, segments: [Segment], cues: [Cue], speech: Bool, vibration: Bool
  ) throws {
    if status == "running" || status == "paused" {
      throw NSError(
        domain: "SessionRuntime", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "A session is already running."])
    }
    self.sessionKey = sessionKey
    self.segments = segments
    self.cues = cues.sorted { $0.atMs < $1.atMs }
    self.speech = speech
    self.vibration = vibration
    totalMs = segments.reduce(0) { $0 + $1.durationMs }
    startedAt = Self.now()
    pausedTotal = 0
    pausedAt = nil
    pausedBy = nil
    lastCue = -1
    finalElapsed = nil
    status = "running"
    beginBackground()
    startTimer()
    tick()
    emit()
  }

  func pause(by reason: String = "user") {
    guard status == "running" else { return }
    pausedAt = Self.now()
    pausedBy = reason
    status = "paused"
    synthesizer.stopSpeaking(at: .immediate)
    emit()
  }

  func resume() {
    guard status == "paused", let pausedAt else { return }
    pausedTotal += Self.now() - pausedAt
    self.pausedAt = nil
    pausedBy = nil
    status = "running"
    announce("Resuming.")
    tick()
    emit()
  }

  // The user ended the session before its planned time.
  func end() {
    guard status == "running" || status == "paused" else { return }
    finalElapsed = elapsedMs()
    status = "ended"
    teardown()
    emit()
  }

  func reset() {
    if status == "running" || status == "paused" { teardown() }
    status = "idle"
    sessionKey = nil
    finalElapsed = nil
    pausedBy = nil
    emit()
  }

  // MARK: Timing

  private func elapsedMs() -> Double {
    if let finalElapsed { return finalElapsed }
    let reference = pausedAt ?? Self.now()
    return max(0, min(totalMs, reference - startedAt - pausedTotal))
  }

  private func startTimer() {
    timer?.cancel()
    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now() + .milliseconds(250), repeating: .milliseconds(250))
    source.setEventHandler { [weak self] in self?.tick() }
    source.resume()
    timer = source
  }

  private func tick() {
    guard status == "running" else { return }
    let elapsed = Self.now() - startedAt - pausedTotal
    // Only the most recent due cue plays; overdue cues are skipped so a late
    // tick never replays a burst of stale transitions.
    if let due = cues.lastIndex(where: { $0.atMs <= elapsed }), due > lastCue {
      lastCue = due
      announce(cues[due].text)
    }
    if elapsed >= totalMs {
      finalElapsed = totalMs
      status = "finished"
      teardown(keepSpeech: true)
      emit()
    }
  }

  private func teardown(keepSpeech: Bool = false) {
    timer?.cancel()
    timer = nil
    if !keepSpeech { synthesizer.stopSpeaking(at: .immediate) }
    endBackground()
  }

  // MARK: Cues

  private func announce(_ text: String) {
    if vibration { AudioServicesPlaySystemSound(kSystemSoundID_Vibrate) }
    guard speech else { return }
    let session = AVAudioSession.sharedInstance()
    // Lower music and pause spoken audio such as podcasts only while speaking.
    try? session.setCategory(
      .playback, mode: .voicePrompt,
      options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
    try? session.setActive(true)
    synthesizer.speak(AVSpeechUtterance(string: text))
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance)
  {
    releaseAudio()
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance)
  {
    releaseAudio()
  }

  private func releaseAudio() {
    guard !synthesizer.isSpeaking else { return }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  // MARK: Calls

  func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
    if !call.hasEnded { pause(by: "call") }
  }

  // MARK: State

  func snapshot() -> [String: Any] {
    [
      "status": status,
      "sessionKey": sessionKey as Any,
      "elapsedMs": elapsedMs(),
      "totalMs": totalMs,
      "pausedBy": pausedBy as Any,
      "backgroundCapable": backgroundCapable,
    ]
  }

  private func emit() {
    onChange?(snapshot())
  }
}

// Holds an iPhone workout session, which keeps the app running while the
// screen is locked.
@available(iOS 26.0, *)
final class WorkoutKeeper: NSObject, HKWorkoutSessionDelegate {
  private let session: HKWorkoutSession
  private let onFailure: () -> Void

  init?(healthStore: HKHealthStore, onFailure: @escaping () -> Void) {
    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .running
    configuration.locationType = .outdoor
    guard
      let session = try? HKWorkoutSession(healthStore: healthStore, configuration: configuration)
    else { return nil }
    self.session = session
    self.onFailure = onFailure
    super.init()
    session.delegate = self
    session.startActivity(with: Date())
  }

  func end() {
    session.delegate = nil
    session.end()
  }

  func workoutSession(
    _ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState, date: Date
  ) {}

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    DispatchQueue.main.async { self.onFailure() }
  }
}
