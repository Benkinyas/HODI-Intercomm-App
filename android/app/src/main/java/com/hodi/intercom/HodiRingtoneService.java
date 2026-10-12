package com.hodi.intercom;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.Vibrator;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class HodiRingtoneService extends Service {

    public static final String ACTION_START_RING = "com.hodi.intercom.START_RING";
    public static final String ACTION_STOP_RING = "com.hodi.intercom.STOP_RING";
    public static final String CHANNEL_ID = "hodi_urgent_channel_v3";
    private static final int NOTIFICATION_ID = 999;

    private MediaPlayer mMediaPlayer;
    private Vibrator mVibrator;
    private PowerManager.WakeLock mWakeLock;
    private int mOriginalAlarmVolume = -1;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_RING.equals(intent.getAction())) {
            stopRinging();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null && ACTION_START_RING.equals(intent.getAction())) {
            String senderName = intent.getStringExtra("senderName");
            String reason = intent.getStringExtra("reason");
            String priority = intent.getStringExtra("priority");

            if (senderName == null) senderName = "Colleague";
            if (reason == null) reason = "Urgent Intercom Page";

            startRinging(senderName, reason, priority);
        }

        return START_STICKY;
    }

    private void startRinging(String senderName, String reason, String priority) {
        stopRinging();

        // 1. Force Maximum Alarm Volume (Bypasses Silent & Ring Volume Settings)
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                mOriginalAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                int maxAlarmVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarmVolume, 0);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Wake Up Screen Display & CPU WakeLock
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                mWakeLock = pm.newWakeLock(
                        PowerManager.FULL_WAKE_LOCK |
                        PowerManager.ACQUIRE_CAUSES_WAKEUP |
                        PowerManager.ON_AFTER_RELEASE,
                        "HODI:IncomingAlertWakeLock"
                );
                mWakeLock.acquire(300000); // 5 minutes max
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 3. Play Loud System Alarm Audio Stream (Bypasses Mute & DND)
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            mMediaPlayer = new MediaPlayer();
            mMediaPlayer.setDataSource(getApplicationContext(), alarmUri);
            mMediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                            .build()
            );
            mMediaPlayer.setLooping(true);
            mMediaPlayer.prepare();
            mMediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 4. Heavy Continuous Hardware Vibration
        try {
            mVibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (mVibrator != null && mVibrator.hasVibrator()) {
                long[] pattern = {0, 1000, 300, 1000, 300};
                mVibrator.vibrate(pattern, 0);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 5. Fullscreen Intent & Notification for Lockscreen Overrides
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 0, fullScreenIntent, pendingFlags
        );

        Intent stopIntent = new Intent(this, HodiRingtoneService.class);
        stopIntent.setAction(ACTION_STOP_RING);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1, stopIntent, pendingFlags);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🚨 URGENT HODI INTERCOM PAGE!")
                .setContentText(senderName + ": \"" + reason + "\"")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setOngoing(true)
                .setSound(null)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(R.mipmap.ic_launcher, "🟢 Acknowledge / Answer", fullScreenPendingIntent)
                .addAction(R.mipmap.ic_launcher, "❌ Dismiss", stopPendingIntent)
                .build();

        startForeground(NOTIFICATION_ID, notification);
    }

    private void stopRinging() {
        if (mMediaPlayer != null) {
            try {
                if (mMediaPlayer.isPlaying()) mMediaPlayer.stop();
                mMediaPlayer.release();
            } catch (Exception e) {}
            mMediaPlayer = null;
        }

        if (mVibrator != null) {
            try { mVibrator.cancel(); } catch (Exception e) {}
            mVibrator = null;
        }

        if (mWakeLock != null && mWakeLock.isHeld()) {
            try { mWakeLock.release(); } catch (Exception e) {}
            mWakeLock = null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Urgent Hodi Intercom Pages",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("High-priority alarm ringing for incoming intercom calls (bypasses Silent/DND)");
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setSound(null, null);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        stopRinging();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
