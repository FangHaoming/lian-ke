package com.fanghaoming.lianke;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.content.pm.PackageInfo;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

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
        copyString(call, intent, "exerciseIcon");
        copyString(call, intent, "phase");
        copyString(call, intent, "timerDirection");
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
            vibrator.vibrate(VibrationEffect.createWaveform(new long[] { 0, 220, 40, 220 }, -1));
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
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            result.put("version", info.versionName == null ? "" : info.versionName);
            result.put(
                "versionCode",
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode
            );
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to read app version", error);
        }
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

    @PluginMethod
    public void downloadAsset(PluginCall call) {
        String urlValue = call.getString("url", "");
        String version = call.getString("version", "");
        String path = call.getString("path", "");
        if (!urlValue.startsWith("https://") || version.isEmpty() || path.isEmpty() || path.contains("..")) {
            call.reject("Invalid asset download request");
            return;
        }
        new Thread(() -> {
            try {
                File root = new File(getContext().getFilesDir(), "lianke-assets/staging/" + version);
                File target = new File(root, path.replaceFirst("^/+", ""));
                if (!target.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator)) {
                    call.reject("Invalid asset path");
                    return;
                }
                File parent = target.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    call.reject("Unable to create asset directory");
                    return;
                }
                HttpURLConnection connection = (HttpURLConnection) new URL(urlValue).openConnection();
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
                    throw new IllegalStateException("HTTP " + connection.getResponseCode());
                }
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(target)) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                } finally {
                    connection.disconnect();
                }
                call.resolve();
            } catch (Exception error) {
                call.reject("Asset download failed", error);
            }
        }, "lianke-asset-download").start();
    }

    @PluginMethod
    public void activateAssetVersion(PluginCall call) {
        String version = call.getString("version", "");
        if (version.isEmpty() || version.contains("..") || version.contains("/")) {
            call.reject("Invalid asset version");
            return;
        }
        File base = new File(getContext().getFilesDir(), "lianke-assets");
        File current = new File(base, "current");
        File staging = new File(base, "staging/" + version);
        File previous = new File(base, "previous");
        if (!staging.isDirectory()) {
            call.reject("Staged asset version not found");
            return;
        }
        if (previous.exists()) deleteRecursively(previous);
        if (current.exists() && !current.renameTo(previous)) {
            call.reject("Unable to preserve current asset version");
            return;
        }
        if (!staging.renameTo(current)) {
            if (previous.exists()) previous.renameTo(current);
            call.reject("Unable to activate asset version");
            return;
        }
        try (FileOutputStream output = new FileOutputStream(new File(base, "current-version"))) {
            output.write(version.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception error) {
            call.reject("Unable to record asset version", error);
            return;
        }
        File stagingRoot = new File(base, "staging");
        File[] leftovers = stagingRoot.listFiles();
        if (leftovers != null) for (File leftover : leftovers) deleteRecursively(leftover);
        call.resolve();
    }

    @PluginMethod
    public void getAssetVersion(PluginCall call) {
        File marker = new File(getContext().getFilesDir(), "lianke-assets/current-version");
        try {
            String value = "";
            if (marker.isFile()) {
                try (InputStream input = new java.io.FileInputStream(marker)) {
                    java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                    byte[] buffer = new byte[256];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    value = new String(output.toByteArray(), java.nio.charset.StandardCharsets.UTF_8).trim();
                }
            }
            JSObject result = new JSObject();
            result.put("version", value);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to read asset version", error);
        }
    }

    private void deleteRecursively(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        file.delete();
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
