package com.fanghaoming.lianke;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.media.RingtoneManager;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class TrainingForegroundService extends Service {
    public static final String ACTION_UPDATE = "com.fanghaoming.lianke.training.UPDATE";
    public static final String ACTION_STOP = "com.fanghaoming.lianke.training.STOP";
    // Bump the channel id so installs that already created the old LOW/
    // silent channel receive the lock-screen-visible importance below.
    private static final String CHANNEL_ID = "active_training_v2";
    private static final String ALERT_CHANNEL_ID = "training_alerts_v1";
    private static final int NOTIFICATION_ID = 4101;
    private static final int ALERT_NOTIFICATION_ID = 4102;
    // Match the app's bright lime theme accent on the lock-screen progress bar.
    private static final int NOTIFICATION_COLOR = Color.rgb(183, 243, 106);
    private final Handler notificationHandler = new Handler(Looper.getMainLooper());
    private Intent latestUpdate;
    private long notifiedEndAt;
    private final Runnable notificationTicker = new Runnable() {
        @Override
        public void run() {
            if (latestUpdate == null) return;
            startForeground(NOTIFICATION_ID, buildNotification(latestUpdate));
            notifyCountdownFinishedIfNeeded(latestUpdate);
            notificationHandler.postDelayed(this, 1000L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            notificationHandler.removeCallbacks(notificationTicker);
            latestUpdate = null;
            notifiedEndAt = 0L;
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        // The web layer may advance to the next phase before the native
        // ticker gets its next second. Check the previous phase once more so
        // that a background app cannot skip the completion alert.
        if (latestUpdate != null) notifyCountdownFinishedIfNeeded(latestUpdate);
        latestUpdate = new Intent(intent);
        long timerEndAt = latestUpdate.getLongExtra("timerEndAt", 0L);
        if (timerEndAt != notifiedEndAt && timerEndAt > 0L && timerEndAt > System.currentTimeMillis()) {
            notifiedEndAt = 0L;
        }
        startForeground(NOTIFICATION_ID, buildNotification(intent));
        notificationHandler.removeCallbacks(notificationTicker);
        notificationHandler.postDelayed(notificationTicker, 1000L);
        return START_STICKY;
    }

    private void notifyCountdownFinishedIfNeeded(Intent data) {
        if (data.getBooleanExtra("paused", false)) return;
        long timerEndAt = data.getLongExtra("timerEndAt", 0L);
        if (timerEndAt <= 0L || timerEndAt > System.currentTimeMillis() || timerEndAt == notifiedEndAt) return;
        notifiedEndAt = timerEndAt;
        if (MainActivity.isAppVisible()) return;

        String exercise = data.getStringExtra("exerciseName");
        String exerciseIcon = data.getStringExtra("exerciseIcon");
        String phase = data.getStringExtra("phase");
        String message = "rest".equals(phase)
            ? "休息结束，继续训练"
            : ("prep".equals(phase) ? "准备结束，开始训练" : "动作时间结束");
        Intent openIntent = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(MainActivity.EXTRA_OPEN_TRAINING, true);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 1, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_training_notification)
            .setColor(NOTIFICATION_COLOR)
            .setContentTitle(exercise == null || exercise.isEmpty() ? "练刻 · 训练提醒" : exercise)
            .setContentText(message)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setDefaults(Notification.DEFAULT_ALL)
            .setWhen(System.currentTimeMillis())
            .build();
        getSystemService(NotificationManager.class).notify(ALERT_NOTIFICATION_ID, notification);
    }

    private Notification buildNotification(Intent data) {
        String exercise = data.getStringExtra("exerciseName");
        String exerciseIcon = data.getStringExtra("exerciseIcon");
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
        if (!paused && timerEndAt > 0L) {
            remaining = Math.max(0, (int) Math.ceil((timerEndAt - System.currentTimeMillis()) / 1000.0));
        } else if (!paused && timerStartAt > 0L) {
            elapsed = Math.max(0, (int) ((System.currentTimeMillis() - timerStartAt) / 1000L));
        }

        Intent openIntent = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(MainActivity.EXTRA_OPEN_TRAINING, true);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String phaseLabel = paused ? "已暂停" : phaseLabel(phase);
        String detail = "第 " + currentSet + "/" + totalSets + " 组 · " + phaseLabel;
        boolean countdown = "prep".equals(phase) || "rest".equals(phase)
            || timerEndAt > 0L;
        String timerLabel = formatSeconds(countdown ? remaining : elapsed);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_training_notification)
            .setColor(NOTIFICATION_COLOR)
            .setContentTitle(exercise == null || exercise.isEmpty() ? "练刻 · 训练中" : exercise)
            .setLargeIcon(loadExerciseIcon(exerciseIcon))
            .setContentText(detail + " · " + timerLabel)
            .setSubText(plan)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setProgress(Math.max(totalItems, 1), Math.max(currentItem - 1, 0), false);

        // Render the timer as text instead of Notification Chronometer. Some
        // lock screens reset a Chronometer to 00:00 whenever an ongoing
        // foreground notification is refreshed.
        builder.setShowWhen(false);
        return builder.build();
    }

    private Bitmap loadExerciseIcon(String iconId) {
        String assetName = iconId == null ? "" : iconId.replaceFirst("^cc-", "");
        if (!assetName.isEmpty()) {
            try (java.io.InputStream stream = getAssets().open("public/action-icons/" + assetName + ".png")) {
                Bitmap icon = BitmapFactory.decodeStream(stream);
                if (icon != null) return icon;
            } catch (Exception ignored) {
                // Custom actions and builds without synced action assets use
                // the app logo below.
            }
        }
        return BitmapFactory.decodeResource(getResources(), R.drawable.fit_log_icon);
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
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("在锁屏和通知栏显示当前动作与训练计时");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setSound(null, null);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationChannel alertChannel = new NotificationChannel(
            ALERT_CHANNEL_ID, "训练结束提醒", NotificationManager.IMPORTANCE_HIGH
        );
        alertChannel.setDescription("倒计时结束时提醒继续训练");
        alertChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        alertChannel.setSound(sound, null);
        getSystemService(NotificationManager.class).createNotificationChannel(alertChannel);
    }

    @Override
    public void onDestroy() {
        notificationHandler.removeCallbacks(notificationTicker);
        latestUpdate = null;
        notifiedEndAt = 0L;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
