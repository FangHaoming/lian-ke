package com.fanghaoming.lianke;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchTrainingNavigation(intent);
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
