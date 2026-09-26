package com.shinsei.anime.engine

import android.annotation.SuppressLint
import android.content.Context
import com.shinsei.anime.ShinseiApp
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.Headers.Companion.toHeaders
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.InputStreamReader
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class ScriptRunner(private val context: Context) {

    private val tag = "ScriptRunner"
    private var webView: WebView? = null
    private val pendingRequests = ConcurrentHashMap<String, CompletableDeferred<String>>()
    private var initDeferred = CompletableDeferred<Boolean>()

    private val okHttpClient: OkHttpClient
        get() = (context.applicationContext as? ShinseiApp)?.sharedOkHttpClient ?: OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .followRedirects(true)
            .build()

    private val bridge = object {
        @JavascriptInterface
        fun onResult(requestId: String, jsonResult: String) {
            val deferred = pendingRequests.remove(requestId)
            deferred?.complete(jsonResult)
        }

        @JavascriptInterface
        fun onError(requestId: String, error: String) {
            Log.e(tag, "JS Error [req=$requestId]: $error")
            val deferred = pendingRequests.remove(requestId)
            deferred?.completeExceptionally(RuntimeException(error))
        }

        @JavascriptInterface
        fun onReady() {
            Log.i(tag, "Headless V8 Engine & ShinseiProvider Ready")
            if (!initDeferred.isCompleted) {
                initDeferred.complete(true)
            }
        }

        @JavascriptInterface
        fun httpFetchSync(url: String, optionsJson: String): String {
            val json = if (optionsJson.isNotEmpty()) JSONObject(optionsJson) else JSONObject()
            val method = json.optString("method", "GET").uppercase()
            val bodyStr = if (json.has("body")) json.getString("body") else null
            val headersMap = mutableMapOf<String, String>()

            val h = json.optJSONObject("headers")
            if (h != null) {
                val keys = h.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    headersMap[k] = h.getString(k)
                }
            }
            if (!headersMap.containsKey("User-Agent")) {
                headersMap["User-Agent"] = "okhttp/4.12.0"
            }

            val reqBuilder = Request.Builder().url(url)
            if (headersMap.isNotEmpty()) {
                reqBuilder.headers(headersMap.toHeaders())
            }

            if (method == "POST") {
                val mediaType = headersMap["Content-Type"]?.toMediaTypeOrNull()
                    ?: "application/json; charset=utf-8".toMediaTypeOrNull()
                val reqBody = (bodyStr ?: "").toRequestBody(mediaType)
                reqBuilder.post(reqBody)
            } else {
                reqBuilder.get()
            }

            val resp = okHttpClient.newCall(reqBuilder.build()).execute()
            return resp.use { response ->
                if (!response.isSuccessful && response.code >= 400) {
                    throw RuntimeException("HTTP ${response.code} on $url")
                }
                response.body?.string() ?: ""
            }
        }
    }

    private val appScope = CoroutineScope(Dispatchers.IO)

    init {
        // Start WebView on main thread
        Handler(Looper.getMainLooper()).post {
            initWebView()
        }
        // Check for bundle updates in parallel — does NOT block WebView init
        appScope.launch {
            checkForRemoteUpdate()
            // Re-check every 30 minutes while app is alive
            while (true) {
                kotlinx.coroutines.delay(30 * 60 * 1000L)
                checkForRemoteUpdate()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initWebView() {
        try {
            val wv = WebView(context.applicationContext)
            val settings = wv.settings
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString =
                "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"

            wv.addJavascriptInterface(bridge, "AndroidBridge")
            wv.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    view?.evaluateJavascript("AndroidBridge.onReady();", null)
                }
            }

            val scriptCode = loadScript()
            val html = """
                <!DOCTYPE html>
                <html>
                <head>
                <meta charset="utf-8">
                <script>
                var exports = {};
                globalThis.ShinseiProvider = exports;

                // Wire up global httpFetch to native OkHttp bridge for fast non-Cloudflare traffic
                globalThis.httpFetch = async function(url, options) {
                    try {
                        const optStr = JSON.stringify(options || {});
                        const res = AndroidBridge.httpFetchSync(url, optStr);
                        return res;
                    } catch (e) {
                        const fetchRes = await fetch(url, options);
                        return await fetchRes.text();
                    }
                };
                </script>
                <script>
                $scriptCode
                </script>
                <script>
                async function invokeMethod(requestId, methodName, argsJson) {
                    try {
                        const args = JSON.parse(argsJson);
                        const fn = ShinseiProvider[methodName];
                        if (typeof fn !== 'function') {
                            throw new Error("Method " + methodName + " not found on ShinseiProvider");
                        }
                        const result = await fn(...args);
                        AndroidBridge.onResult(requestId, JSON.stringify(result));
                    } catch (err) {
                        AndroidBridge.onError(requestId, err.message || String(err));
                    }
                }
                </script>
                </head>
                <body></body>
                </html>
            """.trimIndent()

            wv.loadDataWithBaseURL("https://anilab2.amdapi.click", html, "text/html", "UTF-8", null)
            webView = wv
        } catch (e: Exception) {
            Log.e(tag, "Failed to initialize headless WebView", e)
            if (!initDeferred.isCompleted) {
                initDeferred.complete(false)
            }
        }
    }

    companion object {
        const val GITHUB_SCRIPT_URL =
            "https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/android/app/src/main/assets/provider.bundle.js"
    }

    private val prefs by lazy {
        context.getSharedPreferences("shinsei_provider_prefs", Context.MODE_PRIVATE)
    }

    private fun loadScript(): String {
        val bundled = context.assets.open("provider.bundle.js").use { inputStream ->
            InputStreamReader(inputStream).readText()
        }

        val hotScriptFile = File(context.filesDir, "provider.bundle.js")
        if (hotScriptFile.exists() && hotScriptFile.length() > 0) {
            try {
                val cached = hotScriptFile.readText()
                val bundledVer = extractVersion(bundled)
                val cachedVer = extractVersion(cached)
                if (isNewerVersion(cachedVer, bundledVer)) {
                    Log.i(tag, "Using newer OTA cached script v$cachedVer (bundled is v$bundledVer)")
                    prefs.edit().putString("active_bundle_version", cachedVer).apply()
                    return cached
                } else {
                    Log.i(tag, "Bundled script v$bundledVer >= cached v$cachedVer, clearing stale cache")
                    hotScriptFile.delete()
                    prefs.edit().putString("active_bundle_version", bundledVer).apply()
                }
            } catch (e: Exception) {
                Log.w(tag, "Failed to read cached script, using bundled", e)
                hotScriptFile.delete()
            }
        }
        val bundledVer = extractVersion(bundled)
        prefs.edit().putString("active_bundle_version", bundledVer).apply()
        return bundled
    }

    private fun extractVersion(code: String): String {
        val match = Regex("""exports\.version\s*=\s*["']([^"']+)["']""").find(code)
        return match?.groupValues?.get(1) ?: "1.0.0"
    }

    private fun isNewerVersion(v1: String, v2: String): Boolean {
        try {
            val parts1 = v1.split(".").map { it.toIntOrNull() ?: 0 }
            val parts2 = v2.split(".").map { it.toIntOrNull() ?: 0 }
            val maxLen = maxOf(parts1.size, parts2.size)
            for (i in 0 until maxLen) {
                val p1 = parts1.getOrElse(i) { 0 }
                val p2 = parts2.getOrElse(i) { 0 }
                if (p1 > p2) return true
                if (p1 < p2) return false
            }
        } catch (_: Exception) {}
        return false
    }

    private suspend fun checkForRemoteUpdate() {
        // Throttle checks: don't contact GitHub if checked within last 12 hours
        val lastCheck = prefs.getLong("last_ota_check_time", 0L)
        val now = System.currentTimeMillis()
        if (now - lastCheck < 12 * 60 * 60 * 1000L) {
            Log.d(tag, "OTA check throttled (last checked ${(now - lastCheck) / (60 * 1000)} mins ago)")
            return
        }

        try {
            prefs.edit().putLong("last_ota_check_time", now).apply()
            val req = Request.Builder().url(GITHUB_SCRIPT_URL).build()
            val resp = okHttpClient.newCall(req).execute()
            resp.use { response ->
                if (response.isSuccessful) {
                    val remoteCode = response.body?.string() ?: return
                    if (remoteCode.contains("ShinseiProvider") && remoteCode.length > 2000) {
                        val currentVer = prefs.getString("active_bundle_version", "1.0.0") ?: "1.0.0"
                        val remoteVer = extractVersion(remoteCode)
                        if (isNewerVersion(remoteVer, currentVer)) {
                            Log.i(tag, "OTA: newer bundle v$remoteVer found (current: v$currentVer). Caching...")
                            prefs.edit().putString("active_bundle_version", remoteVer).apply()
                            updateScript(remoteCode)
                        } else {
                            Log.d(tag, "OTA: bundle up to date (current: v$currentVer, remote: v$remoteVer)")
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.d(tag, "OTA bundle check skipped: ${e.message}")
        }
    }

    fun updateScript(newScript: String) {
        try {
            val hotScriptFile = File(context.filesDir, "provider.bundle.js")
            hotScriptFile.writeText(newScript)
            Handler(Looper.getMainLooper()).post {
                webView?.destroy()
                webView = null
                initDeferred = CompletableDeferred()
                initWebView()
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to persist updated script", e)
        }
    }

    suspend fun updateScriptFromUrl(url: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val req = Request.Builder().url(url).build()
            val resp = okHttpClient.newCall(req).execute()
            resp.use { response ->
                if (!response.isSuccessful) return@withContext false
                val code = response.body?.string() ?: return@withContext false
                if (code.isBlank()) return@withContext false
                updateScript(code)
                true
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to fetch script from URL: $url", e)
            false
        }
    }

    fun resetScriptToBundled() {
        try {
            val hotScriptFile = File(context.filesDir, "provider.bundle.js")
            if (hotScriptFile.exists()) {
                hotScriptFile.delete()
            }
            Handler(Looper.getMainLooper()).post {
                webView?.destroy()
                webView = null
                initDeferred = CompletableDeferred()
                initWebView()
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to reset script to bundled asset", e)
        }
    }

    private suspend fun callJsMethod(methodName: String, args: List<Any?> = emptyList()): String {
        val ready = initDeferred.await()
        if (!ready) throw RuntimeException("Headless JS engine failed to initialize")

        val requestId = UUID.randomUUID().toString()
        val deferred = CompletableDeferred<String>()
        pendingRequests[requestId] = deferred

        return try {
            val argsJson = JSONArray(args).toString()
            val jsCall = "invokeMethod(${JSONObject.quote(requestId)}, ${JSONObject.quote(methodName)}, ${JSONObject.quote(argsJson)});"

            withContext(Dispatchers.Main) {
                webView?.evaluateJavascript(jsCall, null)
            }

            withTimeoutOrNull(25000L) {
                deferred.await()
            } ?: throw RuntimeException("Timeout calling ShinseiProvider.$methodName")
        } finally {
            pendingRequests.remove(requestId)
        }
    }

    suspend fun getHome(): String = callJsMethod("getHome")

    suspend fun search(query: String): String = callJsMethod("search", listOf(query))

    suspend fun getDetails(animeId: String): String = callJsMethod("getDetails", listOf(animeId))

    suspend fun getEpisodes(animeId: String): String = callJsMethod("getEpisodes", listOf(animeId))

    suspend fun resolveKyotoStream(
        animeId: String,
        epNum: String,
        serverId: String = "4",
        dub: Boolean = false
    ): String = callJsMethod("resolveKyotoStream", listOf(animeId, epNum, serverId, dub))

    suspend fun getSkipTimes(target: String, epNum: String): String =
        callJsMethod("getSkipTimes", listOf(target, epNum))

    fun destroy() {
        appScope.cancel()
        Handler(Looper.getMainLooper()).post {
            webView?.destroy()
            webView = null
        }
    }
}
