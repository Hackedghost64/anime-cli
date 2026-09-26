package com.shinsei.anime

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.shinsei.anime.data.local.AppDatabase
import com.shinsei.anime.engine.ScriptRunner
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.ConnectionPool
import okhttp3.Dispatcher
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

class ShinseiApp : Application(), ImageLoaderFactory {

    val database by lazy { AppDatabase.getInstance(this) }
    val scriptRunner by lazy { ScriptRunner(this) }

    val sharedOkHttpClient: OkHttpClient by lazy {
        val dispatcher = Dispatcher().apply {
            maxRequests = 128
            maxRequestsPerHost = 24
        }
        val pool = ConnectionPool(16, 3, TimeUnit.MINUTES)
        OkHttpClient.Builder()
            .dispatcher(dispatcher)
            .connectionPool(pool)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        // Pre-warm database and script engine on background thread
        CoroutineScope(Dispatchers.IO).launch {
            try {
                database
                scriptRunner
            } catch (_: Exception) {}
        }
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .okHttpClient { sharedOkHttpClient }
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(150L * 1024 * 1024)
                    .build()
            }
            .crossfade(150)
            .build()
    }

    companion object {
        lateinit var instance: ShinseiApp
            private set
    }
}
