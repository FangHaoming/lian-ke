package com.fanghaoming.lianke;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
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
