package com.shinsei.anime.engine

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

object CloudflareBypassWebView {

    private const val DEFAULT_USER_AGENT =
        "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"

    @SuppressLint("SetJavaScriptEnabled")
    suspend fun fetchWithBypass(
        context: Context,
        url: String,
        timeoutMs: Long = 15000L
    ): String = withContext(Dispatchers.Main) {
        val result = withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine<String> { continuation ->
                val webView = WebView(context.applicationContext)
                val settings = webView.settings
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.userAgentString = DEFAULT_USER_AGENT
                settings.cacheMode = WebSettings.LOAD_DEFAULT

                val cookieManager = CookieManager.getInstance()
                cookieManager.setAcceptCookie(true)
                cookieManager.setAcceptThirdPartyCookies(webView, true)

                var resumed = false

                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        if (resumed) return

                        // Extract page HTML content
                        view?.evaluateJavascript("(function() { return document.documentElement.outerHTML; })();") { html ->
                            val cleanHtml = html?.removePrefix("\"")?.removeSuffix("\"")
                                ?.replace("\\\"", "\"")
                                ?.replace("\\n", "\n")
                                ?: ""

                            // Check if page still has Cloudflare challenge indicators
                            val isStillChallenged = cleanHtml.contains("Checking your browser") ||
                                    cleanHtml.contains("Just a moment...") ||
                                    cleanHtml.contains("challenge-running")

                            if (!isStillChallenged && cleanHtml.isNotEmpty() && cleanHtml != "null") {
                                resumed = true
                                webView.stopLoading()
                                webView.destroy()
                                continuation.resume(cleanHtml)
                            } else {
                                // Wait 1.5s more for challenge to solve
                                Handler(Looper.getMainLooper()).postDelayed({
                                    if (!resumed) {
                                        view.evaluateJavascript("(function() { return document.documentElement.outerHTML; })();") { delayedHtml ->
                                            if (!resumed) {
                                                resumed = true
                                                webView.stopLoading()
                                                webView.destroy()
                                                val finalHtml = delayedHtml?.removePrefix("\"")?.removeSuffix("\"")
                                                    ?.replace("\\\"", "\"")
                                                    ?.replace("\\n", "\n")
                                                    ?: ""
                                                continuation.resume(finalHtml)
                                            }
                                        }
                                    }
                                }, 1500)
                            }
                        }
                    }

                    override fun onReceivedError(
                        view: WebView?,
                        request: WebResourceRequest?,
                        error: WebResourceError?
                    ) {
                        super.onReceivedError(view, request, error)
                        if (request?.isForMainFrame == true && !resumed) {
                            resumed = true
                            webView.destroy()
                            continuation.resume("")
                        }
                    }
                }

                continuation.invokeOnCancellation {
                    webView.stopLoading()
                    webView.destroy()
                }

                webView.loadUrl(url)
            }
        }

        result ?: ""
    }
}
