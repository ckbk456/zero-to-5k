import ExpoModulesCore

struct SegmentRecord: Record {
  @Field var label: String = ""
  @Field var durationMs: Double = 0
}

struct CueRecord: Record {
  @Field var atMs: Double = 0
  @Field var text: String = ""
}

struct StartConfig: Record {
  @Field var sessionKey: String = ""
  @Field var title: String = ""
  @Field var segments: [SegmentRecord] = []
  @Field var cues: [CueRecord] = []
  @Field var speech: Bool = true
  @Field var vibration: Bool = true
}

public class SessionRuntimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SessionRuntime")

    Events("onStateChange")

    OnStartObserving {
      SessionEngine.shared.onChange = { [weak self] state in
        self?.sendEvent("onStateChange", state)
      }
    }

    OnStopObserving {
      SessionEngine.shared.onChange = nil
    }

    AsyncFunction("prepare") { (promise: Promise) in
      SessionEngine.shared.prepare { capable in
        promise.resolve(["backgroundCapable": capable])
      }
    }.runOnQueue(.main)

    AsyncFunction("start") { (config: StartConfig) -> [String: Any] in
      try SessionEngine.shared.start(
        sessionKey: config.sessionKey,
        segments: config.segments.map { Segment(label: $0.label, durationMs: $0.durationMs) },
        cues: config.cues.map { Cue(atMs: $0.atMs, text: $0.text) },
        speech: config.speech,
        vibration: config.vibration)
      return SessionEngine.shared.snapshot()
    }.runOnQueue(.main)

    AsyncFunction("pause") { () -> [String: Any] in
      SessionEngine.shared.pause()
      return SessionEngine.shared.snapshot()
    }.runOnQueue(.main)

    AsyncFunction("resume") { () -> [String: Any] in
      SessionEngine.shared.resume()
      return SessionEngine.shared.snapshot()
    }.runOnQueue(.main)

    AsyncFunction("end") { () -> [String: Any] in
      SessionEngine.shared.end()
      return SessionEngine.shared.snapshot()
    }.runOnQueue(.main)

    AsyncFunction("reset") { () -> [String: Any] in
      SessionEngine.shared.reset()
      return SessionEngine.shared.snapshot()
    }.runOnQueue(.main)

    AsyncFunction("getState") { () -> [String: Any] in
      SessionEngine.shared.snapshot()
    }.runOnQueue(.main)
  }
}
