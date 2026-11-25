package com.fanghaoming.lianke;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.net.Uri;
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
        dispatchTrainingNavigation(getIntent());
        dispatchOAuthCallback(getIntent());
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
        String query = data.getQuery();
        if (query == null || query.isEmpty()) return;
        intent.setData(null);
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable openCallback = () -> {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            getBridge().getWebView().loadUrl(
                "https://fanghaoming.github.io/lian-ke/supabase/callback?" + query
            );
        };
        handler.postDelayed(openCallback, 350L);
        handler.postDelayed(openCallback, 1200L);
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
