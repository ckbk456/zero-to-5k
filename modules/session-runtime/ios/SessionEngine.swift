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
final class SessionEngine: NSObject, AVSpeechSynthesizerDelegate, AVAudioPlayerDelegate,
  CXCallObserverDelegate
{
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
  private var chime: AVAudioPlayer?
  private var pendingWord: String?
  private var activeUtterance: AVSpeechUtterance?
  private var audioTimeout: DispatchWorkItem?
  private var audioGeneration = 0
  private let callObserver = CXCallObserver()
  private let healthStore = HKHealthStore()
  // A WorkoutKeeper on iOS 26+, where iPhone workout sessions exist.
  private var keeper: AnyObject?
  private var backgroundGeneration = UUID()

  override init() {
    super.init()
    synthesizer.delegate = self
    synthesizer.usesApplicationAudioSession = true
    callObserver.setDelegate(self, queue: .main)
    NotificationCenter.default.addObserver(
      self, selector: #selector(didEnterBackground),
      name: UIApplication.didEnterBackgroundNotification, object: nil)
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
    let generation = UUID()
    backgroundGeneration = generation
    backgroundCapable = false
    if #available(iOS 26.0, *), HKHealthStore.isHealthDataAvailable(),
      healthStore.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized,
      let workout = WorkoutKeeper(healthStore: healthStore, onFailure: { [weak self] in
        guard let self, self.backgroundGeneration == generation else { return }
        self.workoutFailed()
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
    backgroundGeneration = UUID()
    if #available(iOS 26.0, *), let workout = keeper as? WorkoutKeeper {
      workout.end()
    }
    keeper = nil
    UIApplication.shared.isIdleTimerDisabled = false
  }

  private func workoutFailed() {
    endBackground()
    backgroundCapable = false
    if status == "running" || status == "paused" {
      UIApplication.shared.isIdleTimerDisabled = true
      if UIApplication.shared.applicationState == .background { pause(by: "background") }
    }
    emit()
  }

  @objc private func didEnterBackground() {
    // Without HealthKit execution, elapsed wall time must not turn missed
    // interval cues into a completed workout while iOS suspends this process.
    if !backgroundCapable { pause(by: "background") }
  }

  // MARK: Commands

  func start(
    sessionKey: String, segments: [Segment], cues: [Cue], speech: Bool, vibration: Bool
  ) throws {
    if status != "idle" {
      throw NSError(
        domain: "SessionRuntime", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Finish saving the current session before starting another."])
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
    if #available(iOS 26.0, *), let workout = keeper as? WorkoutKeeper { workout.pause() }
    silence()
    emit()
  }

  func resume() {
    guard status == "paused", let pausedAt else { return }
    // CallKit may have delivered the call event before the user presses Resume.
    guard !callObserver.calls.contains(where: { !$0.hasEnded }) else {
      pausedBy = "call"
      emit()
      return
    }
    pausedTotal += Self.now() - pausedAt
    self.pausedAt = nil
    pausedBy = nil
    status = "running"
    if #available(iOS 26.0, *), let workout = keeper as? WorkoutKeeper { workout.resume() }
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
    if callObserver.calls.contains(where: { !$0.hasEnded }) {
      pause(by: "call")
      return
    }
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
    if !keepSpeech { silence() }
    endBackground()
  }

  // MARK: Cues

  // A chime, then the cue word. Other audio is ducked only while they play.
  private func announce(_ text: String) {
    if vibration { AudioServicesPlaySystemSound(kSystemSoundID_Vibrate) }
    silence()
    guard speech else { return }
    let session = AVAudioSession.sharedInstance()
    pendingWord = text
    do {
      try session.setCategory(
        .playback, mode: .voicePrompt, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
      try session.setActive(true)
    } catch {
      silence()
      return
    }
    // A failed player or speech engine may never deliver its delegate callback.
    // Stop the cue and restore other audio after the same ceiling as Android.
    let generation = audioGeneration
    let timeout = DispatchWorkItem { [weak self] in
      guard let self, self.audioGeneration == generation else { return }
      self.silence()
    }
    audioTimeout = timeout
    DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(6), execute: timeout)
    if let player = makeChime() {
      chime = player
      if !player.play() {
        chime = nil
        player.stop()
        speakPendingWord()
      }
    } else {
      speakPendingWord()
    }
  }

  private func makeChime() -> AVAudioPlayer? {
    let bundles = [Bundle.main, Bundle(for: SessionEngine.self)]
    let url = bundles.lazy.compactMap { bundle -> URL? in
      if let resources = bundle.url(forResource: "SessionRuntime", withExtension: "bundle"),
        let inner = Bundle(url: resources)?.url(forResource: "chime", withExtension: "wav")
      {
        return inner
      }
      return bundle.url(forResource: "chime", withExtension: "wav")
    }.first
    guard let url, let player = try? AVAudioPlayer(contentsOf: url) else { return nil }
    player.delegate = self
    return player
  }

  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    guard chime === player else { return }
    chime = nil
    speakPendingWord()
  }

  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    guard chime === player else { return }
    chime = nil
    player.stop()
    speakPendingWord()
  }

  private func speakPendingWord() {
    guard let word = pendingWord else {
      releaseAudio()
      return
    }
    pendingWord = nil
    let utterance = AVSpeechUtterance(string: word)
    utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
    activeUtterance = utterance
    synthesizer.speak(utterance)
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance)
  {
    guard activeUtterance === utterance else { return }
    activeUtterance = nil
    releaseAudio()
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance)
  {
    guard activeUtterance === utterance else { return }
    activeUtterance = nil
    releaseAudio()
  }

  private func releaseAudio(force: Bool = false) {
    guard force || (activeUtterance == nil && !synthesizer.isSpeaking &&
      pendingWord == nil && chime?.isPlaying != true) else { return }
    audioTimeout?.cancel()
    audioTimeout = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  private func silence() {
    audioGeneration += 1
    audioTimeout?.cancel()
    audioTimeout = nil
    pendingWord = nil
    activeUtterance = nil
    chime?.stop()
    chime = nil
    synthesizer.stopSpeaking(at: .immediate)
    // Do not depend on a speech callback after stop; it may never arrive.
    releaseAudio(force: true)
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
    configuration.activityType = .walking
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

  func pause() { session.pause() }

  func resume() { session.resume() }

  func workoutSession(
    _ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState, date: Date
  ) {
    if toState == .stopped || toState == .ended {
      DispatchQueue.main.async { self.onFailure() }
    }
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    DispatchQueue.main.async { self.onFailure() }
  }
}
