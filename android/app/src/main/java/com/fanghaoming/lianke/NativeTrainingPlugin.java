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
                File target = new AssetStore(new File(getContext().getFilesDir(), AssetStore.DIRECTORY_NAME))
                    .stagingFile(version, path);
                File base = new File(getContext().getFilesDir(), AssetStore.DIRECTORY_NAME);
                File current = new File(base, "current/" + path);
                File parent = target.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    call.reject("Unable to create asset directory");
                    return;
                }
                if (isReusableMediaPath(path) && current.isFile() && current.length() > 0) {
                    try (InputStream input = new java.io.FileInputStream(current); FileOutputStream output = new FileOutputStream(target)) {
                        byte[] buffer = new byte[8192];
                        int count;
                        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    }
                    call.resolve();
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
        try {
            com.getcapacitor.JSArray values = call.getArray("paths");
            if (values == null) throw new java.io.IOException("Missing asset list");
            String[] paths = new String[values.length()];
            for (int i = 0; i < paths.length; i++) paths[i] = values.getString(i);
            File base = new File(getContext().getFilesDir(), AssetStore.DIRECTORY_NAME);
            new AssetStore(base).activate(version, paths);
            if (call.getBoolean("reload", false)) {
                getActivity().runOnUiThread(() -> {
                    if (getBridge() != null) {
                        getBridge().getWebView().clearCache(true);
                        getBridge().setServerBasePath(new File(base, "current").getAbsolutePath());
                    }
                });
            }

            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to activate asset version", error);
        }
    }

    @PluginMethod
    public void getAssetVersion(PluginCall call) {
        try {
            AssetStore store = new AssetStore(new File(getContext().getFilesDir(), AssetStore.DIRECTORY_NAME));
            JSObject result = new JSObject();
            result.put("version", store.startupDirectory() == null ? "" : store.version());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to read asset version", error);
        }
    }

    private boolean isReusableMediaPath(String path) {
        return path.startsWith("convict-conditioning-pages/");
    }

    @PluginMethod
    public void getAssetDigests(PluginCall call) {
        try {
            com.getcapacitor.JSArray values = call.getArray("paths");
            org.json.JSONObject result = new org.json.JSONObject();
            File current = new File(getContext().getFilesDir(), AssetStore.DIRECTORY_NAME + "/current");
            if (values != null) for (int i = 0; i < values.length(); i++) {
                String path = values.getString(i).replaceFirst("^\\./", "");
                File file = new File(current, path);
                if (file.isFile() && file.length() > 0) {
                    result.put(path, AssetStore.fileDigest(file));
                } else {
                    try (InputStream bundled = getContext().getAssets().open("public/" + path)) {
                        result.put(path, AssetStore.inputDigest(bundled));
                    } catch (java.io.IOException ignored) {
                        // Missing assets are downloaded from the remote manifest.
                    }
                }
            }
            JSObject response = new JSObject();
            for (java.util.Iterator<String> it = result.keys(); it.hasNext();) {
                String key = it.next();
                response.put(key, result.getString(key));
            }
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Unable to read asset digests", error);
        }
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
