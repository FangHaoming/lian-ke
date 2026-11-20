package com.fanghaoming.lianke;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class TrainingForegroundService extends Service {
    public static final String ACTION_UPDATE = "com.fanghaoming.lianke.training.UPDATE";
    public static final String ACTION_STOP = "com.fanghaoming.lianke.training.STOP";
    private static final String CHANNEL_ID = "active_training";
    private static final int NOTIFICATION_ID = 4101;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        startForeground(NOTIFICATION_ID, buildNotification(intent));
        return START_STICKY;
    }

    private Notification buildNotification(Intent data) {
        String exercise = data.getStringExtra("exerciseName");
        String plan = data.getStringExtra("planName");
        String phase = data.getStringExtra("phase");
        boolean paused = data.getBooleanExtra("paused", false);
        int currentSet = data.getIntExtra("currentSet", 1);
        int totalSets = data.getIntExtra("totalSets", 1);
        int currentItem = data.getIntExtra("currentItem", 1);
        int totalItems = data.getIntExtra("totalItems", 1);
        int remaining = data.getIntExtra("remainingSeconds", 0);
        int elapsed = data.getIntExtra("elapsedSeconds", 0);
        long timerEndAt = data.getLongExtra("timerEndAt", 0L);
        long timerStartAt = data.getLongExtra("timerStartAt", 0L);

        Intent openIntent = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String phaseLabel = paused ? "已暂停" : phaseLabel(phase);
        String detail = "第 " + currentSet + "/" + totalSets + " 组 · " + phaseLabel;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_training_notification)
            .setColor(Color.rgb(183, 243, 106))
            .setContentTitle(exercise == null || exercise.isEmpty() ? "练刻 · 训练中" : exercise)
            .setContentText(detail)
            .setSubText(plan)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setProgress(Math.max(totalItems, 1), Math.max(currentItem - 1, 0), false);

        if (!paused && timerEndAt > 0L) {
            builder.setWhen(timerEndAt)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setShowWhen(true);
        } else if (!paused && timerStartAt > 0L) {
            builder.setWhen(timerStartAt)
                .setUsesChronometer(true)
                .setShowWhen(true);
        } else {
            builder.setShowWhen(false)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(
                    detail + " · " + formatSeconds("rest".equals(phase) ? remaining : elapsed)
                ));
        }
        return builder.build();
    }

    private String phaseLabel(String phase) {
        if ("prep".equals(phase)) return "准备";
        if ("rest".equals(phase)) return "休息";
        return "训练";
    }

    private String formatSeconds(int seconds) {
        int safe = Math.max(seconds, 0);
        return String.format("%02d:%02d", safe / 60, safe % 60);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "进行中的训练",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("在锁屏和通知栏显示当前动作与训练计时");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setSound(null, null);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
