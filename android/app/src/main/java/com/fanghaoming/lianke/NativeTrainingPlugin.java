package com.fanghaoming.lianke;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeTraining",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class NativeTrainingPlugin extends Plugin {
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED) {
            resolvePermission(call, true);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolvePermission(call, getPermissionState("notifications") == PermissionState.GRANTED);
    }

    private void resolvePermission(PluginCall call, boolean granted) {
        JSObject result = new JSObject();
        result.put("display", granted ? "granted" : "denied");
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        Intent intent = new Intent(getContext(), TrainingForegroundService.class);
        intent.setAction(TrainingForegroundService.ACTION_UPDATE);
        copyString(call, intent, "planName");
        copyString(call, intent, "exerciseName");
        copyString(call, intent, "phase");
        copyInt(call, intent, "currentSet");
        copyInt(call, intent, "totalSets");
        copyInt(call, intent, "currentItem");
        copyInt(call, intent, "totalItems");
        copyInt(call, intent, "remainingSeconds");
        copyInt(call, intent, "elapsedSeconds");
        copyLong(call, intent, "timerEndAt");
        copyLong(call, intent, "timerStartAt");
        intent.putExtra("paused", call.getBoolean("paused", false));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), TrainingForegroundService.class);
        intent.setAction(TrainingForegroundService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        Vibrator vibrator;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) getContext().getSystemService(VibratorManager.class);
            vibrator = manager == null ? null : manager.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getContext().getSystemService(Vibrator.class);
        }
        if (vibrator != null && vibrator.hasVibrator()) {
            vibrator.vibrate(VibrationEffect.createWaveform(new long[] { 0, 120, 60, 120 }, -1));
        }
        call.resolve();
    }

    @PluginMethod
    public void setScreenAwake(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        getActivity().runOnUiThread(() -> {
            if (enabled) {
                getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("version", BuildConfig.VERSION_NAME);
        result.put("versionCode", BuildConfig.VERSION_CODE);
        call.resolve(result);
    }

    @PluginMethod
    public void openExternalUrl(PluginCall call) {
        String value = call.getString("url", "");
        if (!value.startsWith("https://") && !value.startsWith("http://")) {
            call.reject("Only HTTP(S) URLs can be opened");
            return;
        }
        getContext().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(value)));
        call.resolve();
    }

    private void copyString(PluginCall call, Intent intent, String key) {
        intent.putExtra(key, call.getString(key, ""));
    }

    private void copyInt(PluginCall call, Intent intent, String key) {
        intent.putExtra(key, call.getInt(key, 0));
    }

    private void copyLong(PluginCall call, Intent intent, String key) {
        Double value = call.getDouble(key, 0.0);
        intent.putExtra(key, value.longValue());
    }
}
