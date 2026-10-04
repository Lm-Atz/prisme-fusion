package com.prismefusion.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState); // Capacitor applique AppTheme.NoActionBar ici
        EdgeToEdge.enable(this);
    }
}
