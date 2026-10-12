package com.hodi.intercom;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class BackgroundAlertWorker {

    private static BackgroundAlertWorker sInstance;
    private final Context mContext;
    private Handler mHandler;
    private Runnable mRunnable;
    private boolean mIsRunning = false;

    private String mLastActiveAlertId = null;

    private BackgroundAlertWorker(Context context) {
        mContext = context.getApplicationContext();
        mHandler = new Handler(Looper.getMainLooper());
    }

    public static synchronized BackgroundAlertWorker getInstance(Context context) {
        if (sInstance == null) {
            sInstance = new BackgroundAlertWorker(context);
        }
        return sInstance;
    }

    public void start() {
        if (mIsRunning) return;
        mIsRunning = true;

        mRunnable = new Runnable() {
            @Override
            public void run() {
                pollAlertsHistory();
                if (mIsRunning) {
                    mHandler.postDelayed(this, 3000); // Poll every 3 seconds
                }
            }
        };

        mHandler.post(mRunnable);
    }

    public void stop() {
        mIsRunning = false;
        if (mHandler != null && mRunnable != null) {
            mHandler.removeCallbacks(mRunnable);
        }
    }

    private void pollAlertsHistory() {
        new Thread(() -> {
            try {
                SharedPreferences prefs = mContext.getSharedPreferences("hodi_user_prefs", Context.MODE_PRIVATE);
                String currentUserId = prefs.getString("current_user_id", "");
                String currentUserName = prefs.getString("current_user_name", "");
                String serverUrl = prefs.getString("server_url", "http://10.254.0.196:8080");

                if (currentUserName.isEmpty() && currentUserId.isEmpty()) {
                    return;
                }

                URL url = new URL(serverUrl.replaceAll("/$", "") + "/api/alerts/history");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(2500);
                conn.setReadTimeout(2500);

                if (conn.getResponseCode() == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject response = new JSONObject(sb.toString());
                    JSONArray history = response.optJSONArray("history");

                    if (history != null) {
                        boolean foundActiveIncoming = false;

                        for (int i = 0; i < history.length(); i++) {
                            JSONObject alt = history.getJSONObject(i);
                            String alertId = alt.optString("id");
                            String senderId = alt.optString("senderId");
                            String senderName = alt.optString("senderName");
                            String reason = alt.optString("reason");
                            String priority = alt.optString("priority", "normal");
                            long sentTime = alt.optLong("sentTimestamp", System.currentTimeMillis());

                            if (senderId.equals(currentUserId) || (senderName != null && senderName.equalsIgnoreCase(currentUserName))) {
                                continue;
                            }

                            JSONArray recipientsList = alt.optJSONArray("recipientsList");
                            if (recipientsList != null) {
                                for (int r = 0; r < recipientsList.length(); r++) {
                                    JSONObject rec = recipientsList.getJSONObject(r);
                                    String recId = rec.optString("id");
                                    String recName = rec.optString("name");
                                    String status = rec.optString("status");

                                    boolean isMe = recId.equals(currentUserId) || (recName != null && recName.equalsIgnoreCase(currentUserName));

                                    if (isMe) {
                                        long ageMs = System.currentTimeMillis() - sentTime;
                                        boolean isAck = "acknowledged".equals(status);

                                        if (!isAck && ageMs < 180000) { // Unacknowledged within last 3 mins
                                            foundActiveIncoming = true;
                                            if (!alertId.equals(mLastActiveAlertId)) {
                                                mLastActiveAlertId = alertId;
                                                triggerNativeRing(senderName, reason, priority);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                            if (foundActiveIncoming) break;
                        }

                        if (!foundActiveIncoming && mLastActiveAlertId != null) {
                            mLastActiveAlertId = null;
                            stopNativeRing();
                        }
                    }
                }
                conn.disconnect();
            } catch (Exception e) {
                // Silently ignore network check errors
            }
        }).start();
    }

    private void triggerNativeRing(String senderName, String reason, String priority) {
        Intent intent = new Intent(mContext, HodiRingtoneService.class);
        intent.setAction(HodiRingtoneService.ACTION_START_RING);
        intent.putExtra("senderName", senderName);
        intent.putExtra("reason", reason);
        intent.putExtra("priority", priority);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            mContext.startForegroundService(intent);
        } else {
            mContext.startService(intent);
        }
    }

    private void stopNativeRing() {
        Intent intent = new Intent(mContext, HodiRingtoneService.class);
        intent.setAction(HodiRingtoneService.ACTION_STOP_RING);
        mContext.startService(intent);
    }
}
