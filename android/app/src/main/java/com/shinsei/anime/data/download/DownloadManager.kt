package com.shinsei.anime.data.download

import android.content.Context
import android.content.Intent
import android.os.Environment
import android.util.Log
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.DownloadEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class DownloadManager private constructor(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val app = context.applicationContext as ShinseiApp
    private val downloadDao = app.database.downloadDao()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private val activeJobs = ConcurrentHashMap<String, Job>()
    private val cancelledIds = ConcurrentHashMap.newKeySet<String>()

    private val _currentDownload = MutableStateFlow<DownloadEntity?>(null)
    val currentDownload = _currentDownload.asStateFlow()

    companion object {
        private const val TAG = "DownloadManager"
        private const val BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

        @Volatile
        private var instance: DownloadManager? = null

        fun getInstance(context: Context): DownloadManager {
            return instance ?: synchronized(this) {
                instance ?: DownloadManager(context.applicationContext).also { instance = it }
            }
        }
    }

    fun enqueueDownload(
        animeId: String,
        animeTitle: String,
        animePoster: String,
        epId: String,
        epNum: String,
        epName: String,
        isDub: Boolean = false
    ) {
        val downloadId = "${animeId}_${epId}"
        scope.launch {
            val existing = downloadDao.getDownload(downloadId)
            if (existing != null && existing.status == DownloadEntity.STATUS_COMPLETED && File(existing.localPath).exists()) {
                Log.d(TAG, "Episode already downloaded: $downloadId")
                return@launch
            }

            cancelledIds.remove(downloadId)

            val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_MOVIES), "downloads/$animeId")
            if (!dir.exists()) dir.mkdirs()
            val finalFile = File(dir, "${animeId}_ep${epNum}_${epId}.ts")

            val entity = DownloadEntity(
                id = downloadId,
                animeId = animeId,
                animeTitle = animeTitle,
                animePoster = animePoster,
                epId = epId,
                epNum = epNum,
                epName = epName.ifBlank { "Episode $epNum" },
                localPath = finalFile.absolutePath,
                status = DownloadEntity.STATUS_QUEUED,
                progress = 0
            )
            downloadDao.upsert(entity)

            // Start foreground service to process queue
            val serviceIntent = Intent(context, DownloadService::class.java).apply {
                action = DownloadService.ACTION_START_DOWNLOAD
                putExtra("download_id", downloadId)
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            processNextDownload(downloadId, isDub)
        }
    }

    private fun processNextDownload(downloadId: String, isDub: Boolean) {
        if (activeJobs.containsKey(downloadId)) return

        val job = scope.launch {
            var entity = downloadDao.getDownload(downloadId) ?: return@launch
            downloadDao.updateStatus(downloadId, DownloadEntity.STATUS_DOWNLOADING)
            entity = entity.copy(status = DownloadEntity.STATUS_DOWNLOADING)
            _currentDownload.value = entity

            val tempFile = File(entity.localPath + ".tmp")
            val finalFile = File(entity.localPath)

            try {
                // Step 1: Resolve stream with ScriptRunner
                val streamJsonStr = app.scriptRunner.resolveKyotoStream(
                    animeId = entity.animeId,
                    epNum = entity.epNum,
                    dub = isDub
                )
                val streamObj = JSONObject(streamJsonStr)
                val masterUrl = streamObj.optString("url", streamObj.optString("stream_url", ""))
                if (masterUrl.isEmpty()) {
                    throw IllegalStateException("Failed to resolve stream URL for anime ${entity.animeId} ep ${entity.epNum}")
                }

                val headersMap = mutableMapOf<String, String>()
                val h = streamObj.optJSONObject("headers")
                if (h != null) {
                    val keys = h.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        headersMap[k] = h.getString(k)
                    }
                }
                if (!headersMap.containsKey("Referer")) headersMap["Referer"] = "https://play.app/"
                if (!headersMap.containsKey("User-Agent")) headersMap["User-Agent"] = BROWSER_UA

                // Step 2: Fetch master m3u8 playlist
                val masterReq = Request.Builder().url(masterUrl)
                headersMap.forEach { (k, v) -> masterReq.addHeader(k, v) }
                val masterContent = okHttpClient.newCall(masterReq.build()).execute().use { resp ->
                    resp.body?.string() ?: ""
                }

                // Step 3: Pick variant stream URL (prefer 720p or first stream)
                val variantUrl = extractVariantUrl(masterUrl, masterContent)
                Log.d(TAG, "Selected variant stream URL: $variantUrl")

                // Step 4: Fetch variant m3u8 playlist
                val variantReq = Request.Builder().url(variantUrl)
                headersMap.forEach { (k, v) -> variantReq.addHeader(k, v) }
                val variantContent = okHttpClient.newCall(variantReq.build()).execute().use { resp ->
                    resp.body?.string() ?: ""
                }

                // Step 5: Extract segments
                val segmentUrls = extractSegments(variantUrl, variantContent)
                if (segmentUrls.isEmpty()) {
                    throw IllegalStateException("No video chunks found in playlist: $variantUrl")
                }

                val totalChunks = segmentUrls.size
                downloadDao.upsert(entity.copy(totalChunks = totalChunks))

                if (tempFile.exists()) tempFile.delete()
                tempFile.parentFile?.mkdirs()

                FileOutputStream(tempFile, true).use { outputStream ->
                    for (i in segmentUrls.indices) {
                        if (cancelledIds.contains(downloadId)) {
                            Log.d(TAG, "Download cancelled: $downloadId")
                            tempFile.delete()
                            downloadDao.updateStatus(downloadId, DownloadEntity.STATUS_CANCELLED)
                            _currentDownload.value = null
                            return@launch
                        }

                        val segUrl = segmentUrls[i]
                        val segReq = Request.Builder().url(segUrl)
                        headersMap.forEach { (k, v) -> segReq.addHeader(k, v) }

                        // Retry up to 3 times per chunk
                        var downloaded = false
                        var attempt = 0
                        while (!downloaded && attempt < 3) {
                            attempt++
                            try {
                                okHttpClient.newCall(segReq.build()).execute().use { segResp ->
                                    if (segResp.isSuccessful) {
                                        segResp.body?.byteStream()?.use { input ->
                                            input.copyTo(outputStream)
                                        }
                                        downloaded = true
                                    }
                                }
                            } catch (e: Exception) {
                                if (attempt >= 3) throw e
                                kotlinx.coroutines.delay(1000L)
                            }
                        }

                        val downloadedChunks = i + 1
                        val progress = (downloadedChunks * 100) / totalChunks
                        val currentFileSize = tempFile.length()

                        if (downloadedChunks % 3 == 0 || downloadedChunks == totalChunks) {
                            downloadDao.updateProgress(downloadId, progress, downloadedChunks, currentFileSize)
                            val updated = entity.copy(
                                progress = progress,
                                downloadedChunks = downloadedChunks,
                                fileSize = currentFileSize
                            )
                            _currentDownload.value = updated
                            DownloadService.updateNotification(context, updated)
                        }
                    }
                }

                // Rename temp file to final file
                if (tempFile.exists()) {
                    if (finalFile.exists()) finalFile.delete()
                    tempFile.renameTo(finalFile)
                }

                val finalSize = finalFile.length()
                val completedEntity = entity.copy(
                    status = DownloadEntity.STATUS_COMPLETED,
                    progress = 100,
                    downloadedChunks = totalChunks,
                    fileSize = finalSize,
                    localPath = finalFile.absolutePath
                )
                downloadDao.upsert(completedEntity)
                _currentDownload.value = null
                DownloadService.showCompleteNotification(context, completedEntity)
                Log.d(TAG, "Download finished successfully: ${finalFile.absolutePath} (${finalSize / (1024 * 1024)} MB)")

            } catch (e: Exception) {
                Log.e(TAG, "Download failed for $downloadId", e)
                if (tempFile.exists()) tempFile.delete()
                downloadDao.updateStatus(downloadId, DownloadEntity.STATUS_FAILED)
                _currentDownload.value = null
            } finally {
                activeJobs.remove(downloadId)
            }
        }
        activeJobs[downloadId] = job
    }

    private fun extractVariantUrl(masterUrl: String, masterContent: String): String {
        val lines = masterContent.lines()
        var bestUrl: String? = null
        var foundStream = false

        for (i in lines.indices) {
            val line = lines[i].trim()
            if (line.startsWith("#EXT-X-STREAM-INF")) {
                foundStream = true
            } else if (foundStream && line.isNotEmpty() && !line.startsWith("#")) {
                val full = resolveUrl(masterUrl, line)
                if (line.contains("720") || masterContent.lines()[i - 1].contains("1280x720")) {
                    return full
                }
                if (bestUrl == null) bestUrl = full
                foundStream = false
            }
        }
        return bestUrl ?: masterUrl
    }

    private fun extractSegments(variantUrl: String, variantContent: String): List<String> {
        val segments = mutableListOf<String>()
        val lines = variantContent.lines()
        for (line in lines) {
            val trimmed = line.trim()
            if (trimmed.isNotEmpty() && !trimmed.startsWith("#")) {
                segments.add(resolveUrl(variantUrl, trimmed))
            }
        }
        return segments
    }

    private fun resolveUrl(baseUrl: String, relativeUrl: String): String {
        if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
            return relativeUrl
        }
        val lastSlash = baseUrl.lastIndexOf('/')
        return if (lastSlash != -1) {
            baseUrl.substring(0, lastSlash + 1) + relativeUrl.removePrefix("/")
        } else {
            relativeUrl
        }
    }

    fun cancelDownload(downloadId: String) {
        cancelledIds.add(downloadId)
        activeJobs[downloadId]?.cancel()
        activeJobs.remove(downloadId)
        scope.launch {
            val entity = downloadDao.getDownload(downloadId)
            if (entity != null) {
                File(entity.localPath + ".tmp").delete()
                downloadDao.updateStatus(downloadId, DownloadEntity.STATUS_CANCELLED)
            }
        }
    }

    fun deleteDownload(downloadId: String) {
        cancelDownload(downloadId)
        scope.launch {
            val entity = downloadDao.getDownload(downloadId)
            if (entity != null) {
                val file = File(entity.localPath)
                if (file.exists()) file.delete()
                File(entity.localPath + ".tmp").delete()
                downloadDao.deleteById(downloadId)
            }
        }
    }
}
