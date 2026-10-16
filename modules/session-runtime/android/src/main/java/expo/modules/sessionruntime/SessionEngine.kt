package expo.modules.sessionruntime

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.content.ContextCompat
import java.util.Locale

data class Cue(val atMs: Double, val text: String)

data class Segment(val label: String, val durationMs: Double)

// Owns session time and cues. Elapsed time comes from elapsedRealtime, which
// keeps counting during deep sleep, minus paused time; ticks only decide when
// to check it. All calls happen on the main thread.
object SessionEngine {
  var listener: ((Map<String, Any?>) -> Unit)? = null

  var status = "idle"
    private set
  var title = ""
    private set
  private var sessionKey: String? = null
  private var segments: List<Segment> = emptyList()
  private var cues: List<Cue> = emptyList()
  private var speech = true
  private var vibration = true
  private var totalMs = 0.0
  private var startedAt = 0.0
  private var pausedTotal = 0.0
  private var pausedAt: Double? = null
  private var pausedBy: String? = null
  private var lastCue = -1
  private var lastSegment = -1
  private var finalElapsed: Double? = null

  private val handler = Handler(Looper.getMainLooper())
  private var appContext: Context? = null
  private var tts: TextToSpeech? = null
  private var ttsReady = false
  private var pendingSpeech: String? = null
  private var focusRequest: AudioFocusRequest? = null

  private val ticker =
    object : Runnable {
      override fun run() {
        tick()
        if (status == "running") handler.postDelayed(this, 250)
      }
    }

  private fun now(): Double = SystemClock.elapsedRealtime().toDouble()

  fun start(
    context: Context,
    sessionKey: String,
    title: String,
    segments: List<Segment>,
    cues: List<Cue>,
    speech: Boolean,
    vibration: Boolean,
  ) {
    check(status != "running" && status != "paused") { "A session is already running." }
    appContext = context.applicationContext
    this.sessionKey = sessionKey
    this.title = title
    this.segments = segments
    this.cues = cues.sortedBy { it.atMs }
    this.speech = speech
    this.vibration = vibration
    totalMs = segments.sumOf { it.durationMs }
    startedAt = now()
    pausedTotal = 0.0
    pausedAt = null
    pausedBy = null
    lastCue = -1
    lastSegment = -1
    finalElapsed = null
    status = "running"
    ensureSpeech()
    ContextCompat.startForegroundService(
      context,
      Intent(context, SessionService::class.java).setAction(SessionService.ACTION_SHOW),
    )
    handler.removeCallbacks(ticker)
    ticker.run()
    emit()
  }

  fun pause(reason: String = "user") {
    if (status != "running") return
    pausedAt = now()
    pausedBy = reason
    status = "paused"
    handler.removeCallbacks(ticker)
    tts?.stop()
    releaseFocus()
    emit()
  }

  fun resume() {
    val pausedAt = pausedAt ?: return
    if (status != "paused") return
    pausedTotal += now() - pausedAt
    this.pausedAt = null
    pausedBy = null
    status = "running"
    announce("Resuming.")
    handler.removeCallbacks(ticker)
    ticker.run()
    emit()
  }

  // The user ended the session before its planned time.
  fun end() {
    if (status != "running" && status != "paused") return
    finalElapsed = elapsedMs()
    status = "ended"
    teardown(keepSpeech = false)
    emit()
  }

  fun reset() {
    if (status == "running" || status == "paused") teardown(keepSpeech = false)
    status = "idle"
    sessionKey = null
    finalElapsed = null
    pausedBy = null
    emit()
  }

  fun elapsedMs(): Double {
    finalElapsed?.let { return it }
    val reference = pausedAt ?: now()
    return (reference - startedAt - pausedTotal).coerceIn(0.0, totalMs)
  }

  // Index and end time (elapsed ms) of the segment containing the given time.
  fun segmentAt(elapsed: Double): Pair<Int, Double> {
    var end = 0.0
    segments.forEachIndexed { index, segment ->
      end += segment.durationMs
      if (elapsed < end) return Pair(index, end)
    }
    return Pair(segments.lastIndex, totalMs)
  }

  fun segmentLabel(index: Int): String = segments.getOrNull(index)?.label ?: ""

  private fun tick() {
    if (status != "running") return
    val audio = appContext?.getSystemService(AudioManager::class.java)
    val mode = audio?.mode
    if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_RINGTONE ||
      mode == AudioManager.MODE_IN_COMMUNICATION
    ) {
      pause("call")
      return
    }
    val elapsed = now() - startedAt - pausedTotal
    // Only the most recent due cue plays; overdue cues are skipped so a late
    // tick never replays a burst of stale transitions.
    val due = cues.indexOfLast { it.atMs <= elapsed }
    if (due > lastCue) {
      lastCue = due
      announce(cues[due].text)
    }
    if (elapsed >= totalMs) {
      finalElapsed = totalMs
      status = "finished"
      teardown(keepSpeech = true)
      emit()
      return
    }
    val (segment, _) = segmentAt(elapsed)
    if (segment != lastSegment) {
      lastSegment = segment
      SessionService.refresh()
    }
  }

  private fun teardown(keepSpeech: Boolean) {
    handler.removeCallbacks(ticker)
    if (!keepSpeech) {
      tts?.stop()
      releaseFocus()
    }
    appContext?.let { it.stopService(Intent(it, SessionService::class.java)) }
  }

  // Cues

  private fun ensureSpeech() {
    if (tts != null) return
    val context = appContext ?: return
    tts =
      TextToSpeech(context) { result ->
        handler.post {
          ttsReady = result == TextToSpeech.SUCCESS
          if (ttsReady) {
            tts?.language = Locale.getDefault()
            tts?.setAudioAttributes(attributes)
            tts?.setOnUtteranceProgressListener(
              object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}

                override fun onDone(utteranceId: String?) {
                  handler.post { releaseFocus() }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                  handler.post { releaseFocus() }
                }
              },
            )
            pendingSpeech?.let { speak(it) }
          }
          pendingSpeech = null
        }
      }
  }

  private val attributes: AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()

  private fun announce(text: String) {
    if (vibration) vibrate()
    if (!speech) return
    if (ttsReady) speak(text) else pendingSpeech = text
  }

  private fun speak(text: String) {
    val audio = appContext?.getSystemService(AudioManager::class.java) ?: return
    // Lower other audio only while speaking.
    val request =
      AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attributes)
        .build()
    releaseFocus()
    focusRequest = request
    audio.requestAudioFocus(request)
    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cue-${SystemClock.elapsedRealtime()}")
  }

  private fun releaseFocus() {
    val request = focusRequest ?: return
    appContext?.getSystemService(AudioManager::class.java)?.abandonAudioFocusRequest(request)
    focusRequest = null
  }

  private fun vibrate() {
    val context = appContext ?: return
    val vibrator =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Vibrator::class.java)
      }
    vibrator?.vibrate(VibrationEffect.createOneShot(400, VibrationEffect.DEFAULT_AMPLITUDE))
  }

  // State

  fun snapshot(): Map<String, Any?> =
    mapOf(
      "status" to status,
      "sessionKey" to sessionKey,
      "elapsedMs" to elapsedMs(),
      "totalMs" to totalMs,
      "pausedBy" to pausedBy,
      "backgroundCapable" to true,
    )

  private fun emit() {
    SessionService.refresh()
    listener?.invoke(snapshot())
  }
}
