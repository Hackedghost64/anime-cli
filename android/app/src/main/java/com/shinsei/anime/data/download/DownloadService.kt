package com.shinsei.anime.data.download

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.shinsei.anime.R
import com.shinsei.anime.data.local.DownloadEntity
import com.shinsei.anime.ui.MainActivity

class DownloadService : Service() {

    companion object {
        const val CHANNEL_ID = "shinsei_downloads_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START_DOWNLOAD = "com.shinsei.anime.action.START_DOWNLOAD"
        const val ACTION_CANCEL_DOWNLOAD = "com.shinsei.anime.action.CANCEL_DOWNLOAD"

        fun createNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Anime Downloads",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Shows real-time progress for offline anime downloads"
                    setShowBadge(false)
                }
                val manager = context.getSystemService(NotificationManager::class.java)
                manager?.createNotificationChannel(channel)
            }
        }

        fun updateNotification(context: Context, entity: DownloadEntity) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            val cancelIntent = Intent(context, DownloadService::class.java).apply {
                action = ACTION_CANCEL_DOWNLOAD
                putExtra("download_id", entity.id)
            }
            val cancelPending = PendingIntent.getService(
                context,
                entity.id.hashCode(),
                cancelIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val openAppIntent = Intent(context, MainActivity::class.java)
            val openAppPending = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val sizeMb = entity.fileSize / (1024 * 1024)
            val notif = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle("Downloading ${entity.animeTitle}")
                .setContentText("Ep ${entity.epNum} - ${entity.epName} (${entity.progress}% • ${sizeMb} MB)")
                .setProgress(100, entity.progress, false)
                .setOngoing(true)
                .setContentIntent(openAppPending)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancel", cancelPending)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()

            manager.notify(NOTIFICATION_ID, notif)
        }

        fun showCompleteNotification(context: Context, entity: DownloadEntity) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            val openAppIntent = Intent(context, MainActivity::class.java)
            val openAppPending = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val sizeMb = entity.fileSize / (1024 * 1024)
            val notif = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Download Complete")
                .setContentText("${entity.animeTitle} - Ep ${entity.epNum} ready for offline play (${sizeMb} MB)")
                .setContentIntent(openAppPending)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build()

            manager.notify(entity.id.hashCode(), notif)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel(this)

        val initialNotif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("Shinsei Anime Downloads")
            .setContentText("Preparing background download...")
            .setProgress(100, 0, true)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(NOTIFICATION_ID, initialNotif)

        when (intent?.action) {
            ACTION_CANCEL_DOWNLOAD -> {
                val downloadId = intent.getStringExtra("download_id")
                if (downloadId != null) {
                    DownloadManager.getInstance(this).cancelDownload(downloadId)
                }
            }
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
