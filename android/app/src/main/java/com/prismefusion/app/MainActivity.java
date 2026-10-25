package com.prismefusion.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState); // Capacitor applique AppTheme.NoActionBar ici
        EdgeToEdge.enable(this);
        // v11.1 : la taille de texte du téléphone est respectée jusqu'à 115 % (testé sans débordement) ;
        // au-delà, les boutons du jeu se couperaient, on plafonne.
        try {
            WebSettings s = getBridge().getWebView().getSettings();
            int z = Math.round(getResources().getConfiguration().fontScale * 100f);
            s.setTextZoom(Math.max(85, Math.min(115, z)));
        } catch (Exception ignored) { }
    }
}
