package com.fanghaoming.lianke;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeTrainingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
