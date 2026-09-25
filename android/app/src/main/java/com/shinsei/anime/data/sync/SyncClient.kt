package com.shinsei.anime.data.sync

import android.content.Context
import android.net.Uri
import android.util.Log
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.WatchProgressEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.math.max

data class SyncResult(
    val success: Boolean,
    val receivedCount: Int = 0,
    val sentCount: Int = 0,
    val scriptUpdated: Boolean = false,
    val message: String = ""
)

class SyncClient(private val context: Context) {

    private val tag = "SyncClient"
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    suspend fun performSync(qrPayload: String): SyncResult = withContext(Dispatchers.IO) {
        try {
            val (host, port, token) = parseQrPayload(qrPayload)
                ?: return@withContext SyncResult(false, message = "Invalid QR code format")

            val app = ShinseiApp.instance
            val dao = app.database.watchProgressDao()
            val now = System.currentTimeMillis() / 1000

            // 1. Gather all local progress
            val localRecords = dao.getAllProgress()
            val deltasJsonArray = JSONArray()

            for (record in localRecords) {
                val obj = JSONObject().apply {
                    put("anime_id", record.animeId)
                    put("ep_id", record.epId)
                    put("anime_title", record.animeTitle)
                    put("anime_poster", record.animePoster)
                    put("ep_num", record.epNum)
                    put("ep_name", record.epName)
                    put("position", record.position)
                    put("duration", record.duration)
                    put("updated_at", record.updatedAt)
                }
                deltasJsonArray.put(obj)
            }

            val requestBodyObj = JSONObject().apply {
                put("client_timestamp", now)
                put("progress_deltas", deltasJsonArray)
            }

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val reqBody = requestBodyObj.toString().toRequestBody(mediaType)

            val url = "http://$host:$port/api/sync"
            val request = Request.Builder()
                .url(url)
                .header("X-Sync-Token", token)
                .post(reqBody)
                .build()

            val syncResponse = client.newCall(request).execute()
            syncResponse.use { response ->
                if (response.code == 401) {
                    return@withContext SyncResult(false, message = "Authentication failed: invalid token")
                }
                if (!response.isSuccessful) {
                    return@withContext SyncResult(false, message = "HTTP ${response.code}: sync failed")
                }

                val bodyStr = response.body?.string() ?: ""
                val jsonResponse = JSONObject(bodyStr)
                val incomingDeltas = jsonResponse.optJSONArray("progress_deltas") ?: JSONArray()
                val latestScript = jsonResponse.optString("latest_script", null)
                val serverTimestamp = jsonResponse.optLong("server_timestamp", now)

                // 2. Merge incoming deltas with relative-age conflict resolution
                var mergedCount = 0
                val entitiesToUpsert = mutableListOf<WatchProgressEntity>()

                for (i in 0 until incomingDeltas.length()) {
                    val d = incomingDeltas.getJSONObject(i)
                    val animeId = d.optString("anime_id", "")
                    val epId = d.optString("ep_id", "")
                    if (animeId.isEmpty() || epId.isEmpty()) continue

                    val incomingUpdated = d.optLong("updated_at", 0L)
                    val incomingAge = max(0L, serverTimestamp - incomingUpdated)
                    val normalizedUpdated = max(0L, now - incomingAge)

                    val existing = dao.getProgress(animeId, epId)
                    val shouldUpdate: Boolean
                    if (existing == null) {
                        shouldUpdate = true
                    } else {
                        val existingAge = max(0L, now - existing.updatedAt)
                        shouldUpdate = incomingAge < existingAge
                    }

                    if (shouldUpdate) {
                        entitiesToUpsert.add(
                            WatchProgressEntity(
                                animeId = animeId,
                                epId = epId,
                                animeTitle = d.optString("anime_title", existing?.animeTitle ?: ""),
                                animePoster = d.optString("anime_poster", existing?.animePoster ?: ""),
                                epNum = d.optString("ep_num", existing?.epNum ?: ""),
                                epName = d.optString("ep_name", existing?.epName ?: ""),
                                position = d.optDouble("position", 0.0),
                                duration = d.optDouble("duration", 0.0),
                                updatedAt = normalizedUpdated
                            )
                        )
                        mergedCount++
                    }
                }

                if (entitiesToUpsert.isNotEmpty()) {
                    dao.upsertAll(entitiesToUpsert)
                }

                // 3. Hot-reload script if server delivered updated provider bundle
                var scriptUpdated = false
                if (!latestScript.isNullOrEmpty() && latestScript != "null") {
                    app.scriptRunner.updateScript(latestScript)
                    scriptUpdated = true
                    Log.i(tag, "Hot-reloaded provider.bundle.js (${latestScript.length} bytes)")
                }

                SyncResult(
                    success = true,
                    receivedCount = mergedCount,
                    sentCount = localRecords.size,
                    scriptUpdated = scriptUpdated,
                    message = "Synced $mergedCount records from PC"
                )
            }
        } catch (e: Exception) {
            Log.e(tag, "P2P sync failed", e)
            SyncResult(false, message = "Connection error: ${e.message}")
        }
    }

    private fun parseQrPayload(payload: String): Triple<String, Int, String>? {
        return try {
            val uri = Uri.parse(payload)
            val host = uri.getQueryParameter("host") ?: uri.host ?: ""
            val portStr = uri.getQueryParameter("port")
            val port = portStr?.toIntOrNull() ?: if (uri.port > 0) uri.port else 8088
            val token = uri.getQueryParameter("token") ?: ""

            if (host.isNotEmpty() && token.isNotEmpty()) {
                Triple(host, port, token)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}
