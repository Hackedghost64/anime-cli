package com.shinsei.anime.data.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.FileProvider
import com.shinsei.anime.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

sealed class AppUpdateState {
    object Idle : AppUpdateState()
    object Checking : AppUpdateState()
    data class Available(
        val version: String,
        val releaseNotes: String,
        val downloadUrl: String,
        val apkSize: Long
    ) : AppUpdateState()
    data class Downloading(val progress: Float, val downloadedBytes: Long, val totalBytes: Long) : AppUpdateState()
    data class ReadyToInstall(val apkFile: File) : AppUpdateState()
    data class Error(val message: String) : AppUpdateState()
}

class UpdateManager(
    private val context: Context,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()
) {
    private val tag = "UpdateManager"
    private val prefs = context.getSharedPreferences("app_update_prefs", Context.MODE_PRIVATE)

    private val _updateState = MutableStateFlow<AppUpdateState>(AppUpdateState.Idle)
    val updateState: StateFlow<AppUpdateState> = _updateState.asStateFlow()

    companion object {
        const val GITHUB_RELEASE_API = "https://api.github.com/repos/Hackedghost64/anime-cli/releases/latest"
        private const val CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000L // 24 hours
    }

    suspend fun checkForUpdate(force: Boolean = false) {
        val lastCheck = prefs.getLong("last_update_check_time", 0L)
        val now = System.currentTimeMillis()
        if (!force && now - lastCheck < CHECK_INTERVAL_MS) {
            Log.d(tag, "Update check skipped (throttled)")
            return
        }

        withContext(Dispatchers.IO) {
            _updateState.value = AppUpdateState.Checking
            try {
                prefs.edit().putLong("last_update_check_time", now).apply()
                val request = Request.Builder()
                    .url(GITHUB_RELEASE_API)
                    .header("User-Agent", "ShinseiAnime-Android")
                    .header("Accept", "application/vnd.github.v3+json")
                    .build()

                val response = client.newCall(request).execute()
                response.use { resp ->
                    if (!resp.isSuccessful) {
                        _updateState.value = AppUpdateState.Idle
                        return@withContext
                    }

                    val bodyStr = resp.body?.string() ?: ""
                    if (bodyStr.isBlank()) {
                        _updateState.value = AppUpdateState.Idle
                        return@withContext
                    }

                    val json = JSONObject(bodyStr)
                    val tagName = json.optString("tag_name", "").removePrefix("v").trim()
                    val bodyNotes = json.optString("body", "New release available.")
                    val assets = json.optJSONArray("assets")

                    var apkDownloadUrl = ""
                    var apkSize = 0L

                    if (assets != null) {
                        for (i in 0 until assets.length()) {
                            val asset = assets.getJSONObject(i)
                            val name = asset.optString("name", "")
                            if (name.endsWith(".apk", ignoreCase = true)) {
                                apkDownloadUrl = asset.optString("browser_download_url", "")
                                apkSize = asset.optLong("size", 0L)
                                if (name.contains("release", ignoreCase = true) || name.contains("shinsei", ignoreCase = true)) {
                                    break
                                }
                            }
                        }
                    }

                    val currentVersion = BuildConfig.VERSION_NAME.removePrefix("v").trim()

                    if (apkDownloadUrl.isNotEmpty() && isNewerVersion(tagName, currentVersion)) {
                        Log.i(tag, "New release found: $tagName (current: $currentVersion)")
                        _updateState.value = AppUpdateState.Available(
                            version = tagName,
                            releaseNotes = bodyNotes,
                            downloadUrl = apkDownloadUrl,
                            apkSize = apkSize
                        )
                    } else {
                        Log.d(tag, "App is up to date: $currentVersion vs remote $tagName")
                        _updateState.value = AppUpdateState.Idle
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Failed to check for updates", e)
                _updateState.value = AppUpdateState.Idle
            }
        }
    }

    suspend fun downloadAndInstall(downloadUrl: String) {
        withContext(Dispatchers.IO) {
            try {
                val updatesDir = File(context.cacheDir, "updates")
                if (!updatesDir.exists()) updatesDir.mkdirs()

                val apkFile = File(updatesDir, "ShinseiAnime-update.apk")
                if (apkFile.exists()) apkFile.delete()

                val request = Request.Builder()
                    .url(downloadUrl)
                    .header("User-Agent", "ShinseiAnime-Android")
                    .build()

                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    _updateState.value = AppUpdateState.Error("Failed to download update: HTTP ${response.code}")
                    return@withContext
                }

                val body = response.body ?: run {
                    _updateState.value = AppUpdateState.Error("Empty update package received.")
                    return@withContext
                }

                val totalBytes = body.contentLength()
                var downloadedBytes = 0L

                body.byteStream().use { input ->
                    FileOutputStream(apkFile).use { output ->
                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            downloadedBytes += bytesRead
                            val progress = if (totalBytes > 0) downloadedBytes.toFloat() / totalBytes else 0f
                            _updateState.value = AppUpdateState.Downloading(progress, downloadedBytes, totalBytes)
                        }
                    }
                }

                _updateState.value = AppUpdateState.ReadyToInstall(apkFile)
                triggerInstall(apkFile)
            } catch (e: Exception) {
                Log.e(tag, "Update download failed", e)
                _updateState.value = AppUpdateState.Error("Download failed: ${e.localizedMessage}")
            }
        }
    }

    fun triggerInstall(apkFile: File) {
        try {
            val contentUri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            context.startActivity(installIntent)
        } catch (e: Exception) {
            Log.e(tag, "Failed to launch package installer", e)
            _updateState.value = AppUpdateState.Error("Cannot launch installer: ${e.localizedMessage}")
        }
    }

    fun dismissUpdate() {
        _updateState.value = AppUpdateState.Idle
    }

    private fun isNewerVersion(remote: String, current: String): Boolean {
        try {
            val rParts = remote.split(".").map { it.toIntOrNull() ?: 0 }
            val cParts = current.split(".").map { it.toIntOrNull() ?: 0 }
            val maxLen = maxOf(rParts.size, cParts.size)
            for (i in 0 until maxLen) {
                val r = rParts.getOrElse(i) { 0 }
                val c = cParts.getOrElse(i) { 0 }
                if (r > c) return true
                if (r < c) return false
            }
        } catch (_: Exception) {}
        return false
    }
}
