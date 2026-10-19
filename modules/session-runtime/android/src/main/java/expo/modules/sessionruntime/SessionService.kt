package expo.modules.sessionruntime

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

// Keeps the process and CPU running for the session and shows its ongoing
// notification with Pause/Resume and End.
class SessionService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Workout session", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shows the running session and its controls."
          setShowBadge(false)
        },
      )
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_PAUSE -> SessionEngine.pause()
      ACTION_RESUME -> SessionEngine.resume()
      ACTION_END -> SessionEngine.end()
    }
    val status = SessionEngine.status
    if (status != "running" && status != "paused") {
      // A foreground start must still promote itself before stopping.
      if (intent?.action == ACTION_SHOW) startInForeground()
      stopSelf()
      return START_NOT_STICKY
    }
    startInForeground()
    if (wakeLock == null) {
      wakeLock =
        getSystemService(PowerManager::class.java)
          .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BuildTo30:session")
          .apply { acquire(3 * 60 * 60 * 1000L) }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
    if (instance === this) instance = null
    super.onDestroy()
  }

  private fun startInForeground() {
    val notification = build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun action(action: String, requestCode: Int): PendingIntent =
    PendingIntent.getService(
      this,
      requestCode,
      Intent(this, SessionService::class.java).setAction(action),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  private fun build(): Notification {
    val paused = SessionEngine.status == "paused"
    val elapsed = SessionEngine.elapsedMs()
    val (segment, segmentEnd) = SessionEngine.segmentAt(elapsed)
    val label = SessionEngine.segmentLabel(segment)
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val content =
      launch?.let {
        PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }
    @Suppress("DEPRECATION")
    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID)
      else Notification.Builder(this)
    builder
        .setSmallIcon(android.R.drawable.ic_media_play)
        .setContentTitle(SessionEngine.title)
        .setContentText(if (paused) "Paused · $label" else label)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setCategory(Notification.CATEGORY_WORKOUT)
        .setContentIntent(content)
        .addAction(
          Notification.Action.Builder(
            null,
            if (paused) "Resume" else "Pause",
            action(if (paused) ACTION_RESUME else ACTION_PAUSE, 1),
          ).build(),
        )
        .addAction(Notification.Action.Builder(null, "End", action(ACTION_END, 2)).build())
    if (!paused) {
      // Count down to the end of the current interval without reposting.
      val remaining = (segmentEnd - elapsed).toLong()
      builder
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setWhen(System.currentTimeMillis() + remaining)
        .setShowWhen(true)
    }
    return builder.build()
  }

  companion object {
    const val ACTION_SHOW = "expo.modules.sessionruntime.SHOW"
    const val ACTION_PAUSE = "expo.modules.sessionruntime.PAUSE"
    const val ACTION_RESUME = "expo.modules.sessionruntime.RESUME"
    const val ACTION_END = "expo.modules.sessionruntime.END"
    private const val CHANNEL_ID = "session"
    private const val NOTIFICATION_ID = 3030
    private var instance: SessionService? = null

    fun refresh() {
      val service = instance ?: return
      val status = SessionEngine.status
      if (status == "running" || status == "paused") {
        service.getSystemService(NotificationManager::class.java)
          .notify(NOTIFICATION_ID, service.build())
      }
    }
  }
}
