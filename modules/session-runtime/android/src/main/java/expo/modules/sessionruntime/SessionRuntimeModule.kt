package expo.modules.sessionruntime

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class SegmentRecord : Record {
  @Field val label: String = ""

  @Field val durationMs: Double = 0.0
}

class CueRecord : Record {
  @Field val atMs: Double = 0.0

  @Field val text: String = ""
}

class StartConfig : Record {
  @Field val sessionKey: String = ""

  @Field val title: String = ""

  @Field val segments: List<SegmentRecord> = emptyList()

  @Field val cues: List<CueRecord> = emptyList()

  @Field val speech: Boolean = true

  @Field val vibration: Boolean = true
}

class SessionRuntimeModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name("SessionRuntime")

      Events("onStateChange")

      OnStartObserving { SessionEngine.listener = { sendEvent("onStateChange", it) } }

      OnStopObserving { SessionEngine.listener = null }

      // Android needs no extra permission to run in the background; the
      // notification permission is requested from JavaScript.
      AsyncFunction("prepare") { mapOf("backgroundCapable" to true) }

      AsyncFunction("start") { config: StartConfig ->
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        SessionEngine.start(
          context,
          config.sessionKey,
          config.title,
          config.segments.map { Segment(it.label, it.durationMs) },
          config.cues.map { Cue(it.atMs, it.text) },
          config.speech,
          config.vibration,
        )
        SessionEngine.snapshot()
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("pause") {
        SessionEngine.pause()
        SessionEngine.snapshot()
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("resume") {
        SessionEngine.resume()
        SessionEngine.snapshot()
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("end") {
        SessionEngine.end()
        SessionEngine.snapshot()
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("reset") {
        SessionEngine.reset()
        SessionEngine.snapshot()
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("getState") { SessionEngine.snapshot() }.runOnQueue(Queues.MAIN)
    }
}
