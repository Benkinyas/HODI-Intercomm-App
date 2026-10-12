package com.hodi.intercom;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

public class HodiNativeBridge {

    private final Context mContext;

    public HodiNativeBridge(Context context) {
        this.mContext = context;
    }

    @JavascriptInterface
    public void syncActiveUser(String userId, String userName) {
        if (userId == null) userId = "";
        if (userName == null) userName = "";

        SharedPreferences prefs = mContext.getSharedPreferences("hodi_user_prefs", Context.MODE_PRIVATE);
        prefs.edit()
                .putString("current_user_id", userId)
                .putString("current_user_name", userName)
                .apply();

        // Ensure background worker is running
        BackgroundAlertWorker.getInstance(mContext).start();
    }

    @JavascriptInterface
    public void stopNativeRingtone() {
        Intent intent = new Intent(mContext, HodiRingtoneService.class);
        intent.setAction(HodiRingtoneService.ACTION_STOP_RING);
        mContext.startService(intent);
    }
}
