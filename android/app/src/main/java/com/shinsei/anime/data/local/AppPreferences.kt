package com.shinsei.anime.data.local

import android.content.Context
import android.content.SharedPreferences

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("shinsei_prefs", Context.MODE_PRIVATE)

    var isInitialized: Boolean
        get() = prefs.getBoolean("is_initialized", false)
        set(value) = prefs.edit().putBoolean("is_initialized", value).apply()

    var lastSyncTimestamp: Long
        get() = prefs.getLong("last_sync_ts", 0L)
        set(value) = prefs.edit().putLong("last_sync_ts", value).apply()

    var lastSyncHost: String
        get() = prefs.getString("last_sync_host", "") ?: ""
        set(value) = prefs.edit().putString("last_sync_host", value).apply()
}
