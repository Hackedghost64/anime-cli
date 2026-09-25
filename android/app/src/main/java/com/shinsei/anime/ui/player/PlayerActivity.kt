package com.shinsei.anime.ui.player

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.WatchProgressEntity
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.ShinseiAnimeTheme
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class PlayerActivity : ComponentActivity() {

    private lateinit var media3Manager: Media3Manager
    private var animeId: String = ""
    private var animeTitle: String = ""
    private var animePoster: String = ""
    private var epId: String = ""
    private var epNum: String = "1"
    private var epName: String = ""
    private var isDub: Boolean = false
    private var malId: Long = 0L

    private var episodesList = mutableListOf<JSONObject>()
    private var currentEpIndex = 0

    private var isPipMode = false
    private var autoSaveJob: Job? = null

    @OptIn(UnstableApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on during playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUI()

        animeId = intent.getStringExtra("anime_id") ?: ""
        animeTitle = intent.getStringExtra("anime_title") ?: "Anime"
        animePoster = intent.getStringExtra("anime_poster") ?: ""
        epId = intent.getStringExtra("ep_id") ?: ""
        epNum = intent.getStringExtra("ep_num") ?: "1"
        epName = intent.getStringExtra("ep_name") ?: ""
        isDub = intent.getBooleanExtra("is_dub", false)
        malId = intent.getLongExtra("mal_id", 0L)

        val rawEpisodes = intent.getStringExtra("episodes_json") ?: "[]"
        try {
            val arr = JSONArray(rawEpisodes)
            for (i in 0 until arr.length()) {
                val epObj = arr.getJSONObject(i)
                episodesList.add(epObj)
                if (epObj.optString("id") == epId || epObj.optString("num") == epNum) {
                    currentEpIndex = i
                }
            }
        } catch (e: Exception) {
            // ignore
        }

        media3Manager = Media3Manager(this, lifecycleScope)

        setContent {
            ShinseiAnimeTheme {
                PlayerScreenContent()
            }
        }

        loadStreamAndPlay()
        startPeriodicProgressSaving()
    }

    private fun hideSystemUI() {
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    private fun loadStreamAndPlay() {
        lifecycleScope.launch {
            try {
                val app = ShinseiApp.instance
                // Check if existing saved progress
                val existing = app.database.watchProgressDao().getProgress(animeId, epId)
                val initialPosMs = ((existing?.position ?: 0.0) * 1000).toLong()

                // Resolve Kyoto stream m3u8
                val streamJsonStr = app.scriptRunner.resolveKyotoStream(
                    animeId = animeId,
                    epNum = epNum,
                    dub = isDub
                )
                val streamObj = JSONObject(streamJsonStr)
                val streamUrl = streamObj.optString("url", streamObj.optString("stream_url", ""))
                val headersMap = mutableMapOf<String, String>()
                val h = streamObj.optJSONObject("headers")
                if (h != null) {
                    val keys = h.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        headersMap[k] = h.getString(k)
                    }
                }

                if (streamUrl.isNotEmpty()) {
                    media3Manager.prepareHlsStream(
                        m3u8Url = streamUrl,
                        headers = headersMap,
                        initialPositionMs = initialPosMs
                    )
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    private fun startPeriodicProgressSaving() {
        autoSaveJob?.cancel()
        autoSaveJob = lifecycleScope.launch {
            while (isActive) {
                delay(5000L)
                saveCurrentProgress()
            }
        }
    }

    private suspend fun saveCurrentProgress() {
        val player = media3Manager.getPlayer()
        val curPosMs = player.currentPosition
        val durMs = player.duration
        if (durMs <= 0 || curPosMs < 2000L) return

        val entity = WatchProgressEntity(
            animeId = animeId,
            epId = epId,
            animeTitle = animeTitle,
            animePoster = animePoster,
            epNum = epNum,
            epName = epName,
            position = curPosMs / 1000.0,
            duration = durMs / 1000.0,
            updatedAt = System.currentTimeMillis() / 1000
        )
        ShinseiApp.instance.database.watchProgressDao().upsert(entity)
    }

    @OptIn(UnstableApi::class)
    @Composable
    private fun PlayerScreenContent() {
        val playerState by media3Manager.playerState.collectAsState()
        var controlsVisible by remember { mutableStateOf(true) }
        var isZoomMode by remember { mutableStateOf(false) }

        var activeDoubleTap by remember { mutableStateOf<DoubleTapRipple?>(null) }
        var activeVolume by remember { mutableStateOf<Float?>(null) }
        var activeBrightness by remember { mutableStateOf<Float?>(null) }

        var skipIntroRange by remember { mutableStateOf<Pair<Long, Long>?>(null) }
        var skipOutroRange by remember { mutableStateOf<Pair<Long, Long>?>(null) }

        // Fetch AniSkip intervals (supports both malId and animeTitle)
        LaunchedEffect(animeTitle, malId, epNum) {
            val queryTarget = if (malId > 0) malId.toString() else animeTitle
            if (queryTarget.isNotEmpty()) {
                try {
                    val skipJsonStr = ShinseiApp.instance.scriptRunner.getSkipTimes(queryTarget, epNum)
                    val skipObj = JSONObject(skipJsonStr)
                    val opArr = skipObj.optJSONArray("op")
                    if (opArr != null && opArr.length() >= 2) {
                        val startMs = (opArr.getDouble(0) * 1000).toLong()
                        val endMs = (opArr.getDouble(1) * 1000).toLong()
                        skipIntroRange = Pair(startMs, endMs)
                    }
                    val edArr = skipObj.optJSONArray("ed")
                    if (edArr != null && edArr.length() >= 2) {
                        val startMs = (edArr.getDouble(0) * 1000).toLong()
                        val endMs = (edArr.getDouble(1) * 1000).toLong()
                        skipOutroRange = Pair(startMs, endMs)
                    }
                } catch (e: Exception) {
                    // ignore
                }
            }
        }

        // Auto-hide controls timer (3.5 seconds)
        LaunchedEffect(controlsVisible, playerState.isPlaying) {
            if (controlsVisible && playerState.isPlaying) {
                delay(3500L)
                controlsVisible = false
            }
        }

        // Auto-clear gesture indicators
        LaunchedEffect(activeVolume) {
            if (activeVolume != null) {
                delay(1200L)
                activeVolume = null
            }
        }
        LaunchedEffect(activeBrightness) {
            if (activeBrightness != null) {
                delay(1200L)
                activeBrightness = null
            }
        }
        LaunchedEffect(activeDoubleTap) {
            if (activeDoubleTap != null) {
                delay(600L)
                activeDoubleTap = null
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BackgroundBlack)
        ) {
            // Media3 PlayerView (useController = false so gestures pass cleanly to Compose)
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = media3Manager.getPlayer()
                        useController = false
                        resizeMode = if (isZoomMode) {
                            AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                        } else {
                            AspectRatioFrameLayout.RESIZE_MODE_FIT
                        }
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    }
                },
                update = { pv ->
                    pv.resizeMode = if (isZoomMode) {
                        AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                    } else {
                        AspectRatioFrameLayout.RESIZE_MODE_FIT
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            // Gesture Detector Layer
            PlayerGestureDetector(
                modifier = Modifier.fillMaxSize(),
                onSingleTap = { controlsVisible = !controlsVisible },
                onDoubleTapSeek = { offsetMs -> media3Manager.seekRelative(offsetMs) },
                onScrubSeek = { deltaMs -> media3Manager.seekRelative(deltaMs) },
                onScrubCommit = { /* noop */ },
                onBrightnessChange = { b -> activeBrightness = b },
                onVolumeChange = { v -> activeVolume = v },
                onDoubleTapVisual = { rip -> activeDoubleTap = rip }
            ) {
                // Crunchyroll Controls Overlay
                CrunchyrollPlayerControls(
                    animeTitle = animeTitle,
                    episodeTitle = epName,
                    episodeNum = epNum,
                    isDub = isDub,
                    playerState = playerState,
                    controlsVisible = controlsVisible && !isPipMode,
                    hasNextEpisode = currentEpIndex + 1 < episodesList.size,
                    isZoomMode = isZoomMode,
                    activeDoubleTap = activeDoubleTap,
                    activeVolume = activeVolume,
                    activeBrightness = activeBrightness,
                    skipIntroRange = skipIntroRange,
                    skipOutroRange = skipOutroRange,
                    onToggleControls = { controlsVisible = !controlsVisible },
                    onBack = { finish() },
                    onPlayPause = { media3Manager.togglePlayPause() },
                    onSeekRelative = { offsetMs -> media3Manager.seekRelative(offsetMs) },
                    onSeekTo = { posMs -> media3Manager.seekTo(posMs) },
                    onNextEpisode = { playNextEpisode() },
                    onToggleDub = {
                        isDub = !isDub
                        loadStreamAndPlay()
                    },
                    onToggleZoom = { isZoomMode = !isZoomMode },
                    onSelectQuality = { q -> media3Manager.setQuality(q) },
                    onSelectSpeed = { s -> media3Manager.setPlaybackSpeed(s) },
                    onSkipIntro = {
                        val end = skipIntroRange?.second ?: return@CrunchyrollPlayerControls
                        media3Manager.seekTo(end)
                    },
                    onSkipOutro = {
                        val end = skipOutroRange?.second ?: return@CrunchyrollPlayerControls
                        media3Manager.seekTo(end)
                    }
                )
            }
        }
    }

    private fun playNextEpisode() {
        if (currentEpIndex + 1 < episodesList.size) {
            lifecycleScope.launch {
                saveCurrentProgress()
                currentEpIndex++
                val nextEp = episodesList[currentEpIndex]
                epId = nextEp.optString("id", "")
                epNum = nextEp.optString("num", "${currentEpIndex + 1}")
                epName = nextEp.optString("name", "")
                loadStreamAndPlay()
            }
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        enterPiP()
    }

    private fun enterPiP() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isPipMode = isInPictureInPictureMode
    }

    override fun onPause() {
        super.onPause()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !isInPictureInPictureMode) {
            media3Manager.pause()
        }
        lifecycleScope.launch {
            saveCurrentProgress()
        }
    }

    override fun onStop() {
        super.onStop()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !isInPictureInPictureMode) {
            media3Manager.pause()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        autoSaveJob?.cancel()
        media3Manager.release()
    }
}
