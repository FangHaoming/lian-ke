package com.fanghaoming.lianke;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.net.Uri;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeWebViewClient;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import org.json.JSONObject;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String EXTRA_OPEN_TRAINING = "openTraining";
    private static volatile boolean appVisible;

    public static boolean isAppVisible() {
        return appVisible;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeTrainingPlugin.class);
        super.onCreate(savedInstanceState);
        installVersionedAssetClient();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().reload();
        }
        dispatchTrainingNavigation(getIntent());
        dispatchOAuthCallback(getIntent());
    }

    private void installVersionedAssetClient() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse updated = serveUpdatedAsset(request);
                return updated == null ? super.shouldInterceptRequest(view, request) : updated;
            }
        });
    }

    private WebResourceResponse serveUpdatedAsset(WebResourceRequest request) {
        String path = request.getUrl().getPath();
        if (path == null || path.contains("..") || path.startsWith("/" + "lianke-assets")) return null;
        if ("/".equals(path)) path = "/index.html";
        File root = new File(getFilesDir(), "lianke-assets/current");
        File asset = new File(root, path.replaceFirst("^/+", ""));
        try {
            String rootPath = root.getCanonicalPath();
            String assetPath = asset.getCanonicalPath();
            if (!assetPath.startsWith(rootPath + File.separator) || !asset.isFile()) return null;
            String extension = MimeTypeMap.getFileExtensionFromUrl(asset.getName()).toLowerCase();
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (mime == null) mime = "application/octet-stream";
            return new WebResourceResponse(mime, null, new FileInputStream(asset));
        } catch (IOException ignored) {
            return null;
        }
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchTrainingNavigation(intent);
        dispatchOAuthCallback(intent);
    }

    private void dispatchOAuthCallback(android.content.Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"lianke".equals(data.getScheme())) return;
        Uri.Builder callbackBuilder = data.buildUpon().clearQuery();
        for (String name : data.getQueryParameterNames()) {
            if ("app".equals(name)) continue;
            callbackBuilder.appendQueryParameter(name, data.getQueryParameter(name));
        }
        String query = callbackBuilder.build().getQuery();
        if (query == null || query.isEmpty()) return;
        intent.setData(null);
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable openCallback = () -> {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            getBridge().getWebView().evaluateJavascript(
                "window.__liankeOAuthCallbackQuery=" + JSONObject.quote("?" + query)
                    + ";window.dispatchEvent(new CustomEvent('lianke-oauth-callback'))",
                null
            );
        };
        handler.postDelayed(() -> {
            if (getBridge() == null || getBridge().getWebView() == null) {
                handler.postDelayed(openCallback, 800L);
                return;
            }
            openCallback.run();
        }, 350L);
    }

    private void dispatchTrainingNavigation(android.content.Intent intent) {
        if (intent == null || !intent.getBooleanExtra(EXTRA_OPEN_TRAINING, false)) return;
        intent.removeExtra(EXTRA_OPEN_TRAINING);
        // The WebView may still be booting on a cold start. Dispatch after the
        // bridge is ready; the second attempt covers a slow first page load.
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable openTraining = () -> {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            getBridge().getWebView().evaluateJavascript(
                "window.__liankeOpenTrainingRequested=true;window.dispatchEvent(new CustomEvent('lianke-open-training'))",
                null
            );
        };
        handler.postDelayed(openTraining, 350L);
        handler.postDelayed(openTraining, 1200L);
    }

    @Override
    public void onStart() {
        super.onStart();
        appVisible = true;
    }

    @Override
    public void onStop() {
        appVisible = false;
        super.onStop();
    }
}
