package expo.modules.sessionruntime

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
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
  private var ttsFailed = false
  private var pendingSpeech: String? = null
  private var chime: MediaPlayer? = null
  private var focusRequest: AudioFocusRequest? = null
  private var legacyFocusListener: AudioManager.OnAudioFocusChangeListener? = null
  private var focusHeld = false
  private var cueGeneration = 0L
  private var activeUtterance: String? = null
  // A broken/missing TTS engine must never leave the user's music ducked.
  private val focusTimeout = Runnable { silence() }

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
    check(status == "idle") { "Finish saving the current session before starting another." }
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
    try {
      ContextCompat.startForegroundService(
        context,
        Intent(context, SessionService::class.java).setAction(SessionService.ACTION_SHOW),
      )
    } catch (error: Exception) {
      status = "idle"
      this.sessionKey = null
      throw error
    }
    if (speech) ensureSpeech()
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
    silence()
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
    if (!keepSpeech) silence()
    // Keep the service alive until the final cue finishes (or its bounded
    // timeout), so background execution cannot end halfway through "Done".
    if (!keepSpeech || !focusHeld) stopService()
  }

  private fun stopService() {
    appContext?.let { it.stopService(Intent(it, SessionService::class.java)) }
  }

  // Cues

  private fun ensureSpeech() {
    if (tts != null && !ttsFailed) return
    tts?.shutdown()
    tts = null
    ttsReady = false
    ttsFailed = false
    val context = appContext ?: return
    tts =
      TextToSpeech(context) { result ->
        handler.post {
          // All current cue text is English, independently of device locale.
          val language = if (result == TextToSpeech.SUCCESS) tts?.setLanguage(Locale.US) else null
          ttsReady = language != null && language >= TextToSpeech.LANG_AVAILABLE
          ttsFailed = !ttsReady
          if (ttsReady) {
            tts?.setAudioAttributes(attributes)
            tts?.setOnUtteranceProgressListener(
              object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}

                override fun onDone(utteranceId: String?) {
                  handler.post { finishUtterance(utteranceId) }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                  handler.post { finishUtterance(utteranceId) }
                }
              },
            )
            pendingSpeech?.let { speakWord(it) }
          } else if (chime == null) {
            releaseFocus()
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

  // A chime, then the cue word. Other audio is ducked only while they play.
  private fun announce(text: String) {
    if (vibration) vibrate()
    if (!speech) return
    silence()
    val context = appContext ?: return
    val audio = context.getSystemService(AudioManager::class.java) ?: return
    val generation = cueGeneration
    val listener = AudioManager.OnAudioFocusChangeListener { change ->
      if (generation == cueGeneration &&
        (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)
      ) {
        silence()
      }
    }
    val focusResult =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val request =
          AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(attributes)
            .setOnAudioFocusChangeListener(listener, handler)
            .build()
        focusRequest = request
        audio.requestAudioFocus(request)
      } else {
        legacyFocusListener = listener
        @Suppress("DEPRECATION")
        val result = audio.requestAudioFocus(
          listener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
        )
        result
      }
    if (focusResult != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
      releaseFocus()
      return
    }
    focusHeld = true
    handler.postDelayed(focusTimeout, 6_000)
    var createdPlayer: MediaPlayer? = null
    val player =
      try {
        context.resources.openRawResourceFd(R.raw.chime).use { file ->
          MediaPlayer().apply {
            createdPlayer = this
            setAudioAttributes(attributes)
            setDataSource(file.fileDescriptor, file.startOffset, file.length)
            prepare()
          }
        }
      } catch (error: Exception) {
        createdPlayer?.release()
        null
      }
    if (player == null) {
      speakWord(text)
      return
    }
    chime = player
    player.setOnCompletionListener {
      it.release()
      if (chime === it) chime = null
      if (generation == cueGeneration) speakWord(text)
    }
    player.setOnErrorListener { failed, _, _ ->
      if (chime === failed) chime = null
      failed.release()
      if (generation == cueGeneration) speakWord(text)
      true
    }
    try {
      player.start()
    } catch (error: Exception) {
      if (chime === player) chime = null
      player.release()
      speakWord(text)
    }
  }

  private fun speakWord(text: String) {
    if (ttsReady) {
      val utterance = "cue-$cueGeneration"
      activeUtterance = utterance
      if (tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utterance) != TextToSpeech.SUCCESS) {
        activeUtterance = null
        releaseFocus()
      }
    } else if (!ttsFailed) {
      pendingSpeech = text
    } else {
      releaseFocus()
    }
  }

  private fun finishUtterance(utteranceId: String?) {
    // A stopped older utterance may deliver its callback after a new cue starts.
    if (utteranceId == null || utteranceId != activeUtterance) return
    activeUtterance = null
    releaseFocus()
  }

  private fun silence() {
    cueGeneration += 1
    activeUtterance = null
    chime?.release()
    chime = null
    pendingSpeech = null
    tts?.stop()
    releaseFocus()
  }

  private fun releaseFocus() {
    handler.removeCallbacks(focusTimeout)
    val audio = appContext?.getSystemService(AudioManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { audio?.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      legacyFocusListener?.let { audio?.abandonAudioFocus(it) }
    }
    focusRequest = null
    legacyFocusListener = null
    focusHeld = false
    if (status == "finished" || status == "ended" || status == "idle") stopService()
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
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator?.vibrate(VibrationEffect.createOneShot(400, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
      @Suppress("DEPRECATION")
      vibrator?.vibrate(400L)
    }
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
