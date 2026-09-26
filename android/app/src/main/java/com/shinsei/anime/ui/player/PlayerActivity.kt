package com.shinsei.anime.ui.player

import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.ViewGroup
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.WatchProgressEntity
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.CrunchyOrange
import com.shinsei.anime.ui.theme.ShinseiAnimeTheme
import com.shinsei.anime.ui.theme.SurfaceBorder
import com.shinsei.anime.ui.theme.SurfaceDark
import com.shinsei.anime.ui.theme.SurfaceElevated
import com.shinsei.anime.ui.theme.TextMuted
import com.shinsei.anime.ui.theme.TextPrimary
import com.shinsei.anime.ui.theme.TextSecondary
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class PlayerActivity : ComponentActivity() {

    private lateinit var media3Manager: Media3Manager
    private var animeId: String = ""
    private var animeTitle: String = ""
    private var animePoster: String = ""
    private var epId: String = ""
    private var epNum by androidx.compose.runtime.mutableStateOf("1")
    private var epName by androidx.compose.runtime.mutableStateOf("")
    private var isDub: Boolean = false
    private var malId: Long = 0L

    private val episodesList = androidx.compose.runtime.mutableStateListOf<JSONObject>()
    private var currentEpIndex by androidx.compose.runtime.mutableIntStateOf(0)

    private var isPipMode = false
    private var autoSaveJob: Job? = null

    @OptIn(UnstableApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

        // If launched without full episodes list (e.g., from Continue Watching), fetch full episode list in background
        if (episodesList.isEmpty() && animeId.isNotEmpty()) {
            lifecycleScope.launch(Dispatchers.IO) {
                try {
                    val epJson = ShinseiApp.instance.scriptRunner.getEpisodes(animeId)
                    val arr = JSONArray(epJson)
                    val loaded = mutableListOf<JSONObject>()
                    var matchedIdx = 0
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        loaded.add(obj)
                        if (obj.optString("id") == epId || obj.optString("num") == epNum) {
                            matchedIdx = i
                        }
                    }
                    withContext(Dispatchers.Main) {
                        episodesList.clear()
                        episodesList.addAll(loaded)
                        currentEpIndex = matchedIdx
                    }
                } catch (e: Exception) {
                    Log.d("PlayerActivity", "Failed to fetch episodes list: ${e.message}")
                }
            }
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
                val existing = app.database.watchProgressDao().getProgress(animeId, epId)
                val initialPosMs = ((existing?.position ?: 0.0) * 1000).toLong()

                val downloaded = app.database.downloadDao().getDownload(animeId, epId)
                if (downloaded != null &&
                    downloaded.status == com.shinsei.anime.data.local.DownloadEntity.STATUS_COMPLETED &&
                    java.io.File(downloaded.localPath).exists()
                ) {
                    media3Manager.prepareMedia(url = downloaded.localPath, initialPositionMs = initialPosMs)
                    return@launch
                }

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
                    media3Manager.prepareMedia(
                        url = streamUrl,
                        headers = headersMap,
                        initialPositionMs = initialPosMs
                    )
                } else {
                    android.widget.Toast.makeText(
                        this@PlayerActivity,
                        "Stream unavailable for episode $epNum",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                android.util.Log.e("PlayerActivity", "Playback resolution error", e)
                android.widget.Toast.makeText(
                    this@PlayerActivity,
                    "Playback error: ${e.message}",
                    android.widget.Toast.LENGTH_LONG
                ).show()
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

    // Called from controls via lambda — locks to landscape
    internal fun goFullscreen() {
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    }

    // Called from minimize button — returns to portrait
    internal fun exitFullscreen() {
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
    }

    // "View All Episodes" — opens DetailScreen for this anime in MainActivity
    private fun openDetailScreen() {
        val intent = android.content.Intent(this, com.shinsei.anime.ui.MainActivity::class.java).apply {
            putExtra("open_detail_anime_id", animeId)
            flags = android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    @OptIn(UnstableApi::class)
    @Composable
    private fun PlayerScreenContent() {
        val playerState by media3Manager.playerState.collectAsState()
        var controlsVisible by remember { mutableStateOf(true) }
        var activeDoubleTap by remember { mutableStateOf<DoubleTapRipple?>(null) }
        var skipIntroRange by remember { mutableStateOf<Pair<Long, Long>?>(null) }
        var skipOutroRange by remember { mutableStateOf<Pair<Long, Long>?>(null) }

        val config = LocalConfiguration.current
        val isLandscape = config.orientation == Configuration.ORIENTATION_LANDSCAPE

        // AniSkip intervals
        LaunchedEffect(animeTitle, malId, epNum) {
            skipIntroRange = null
            skipOutroRange = null
            val cleanEp = epNum.replace(Regex("[^0-9]"), "").ifEmpty { "1" }
            val queryTarget = if (malId > 0) malId.toString() else animeTitle.trim()
            if (queryTarget.isNotEmpty()) {
                try {
                    val skipJsonStr = ShinseiApp.instance.scriptRunner.getSkipTimes(queryTarget, cleanEp)
                    Log.d("PlayerActivity", "AniSkip response for $queryTarget ep $cleanEp: $skipJsonStr")
                    val skipObj = JSONObject(skipJsonStr)
                    skipObj.optJSONArray("op")?.let { opArr ->
                        if (opArr.length() >= 2) {
                            val startMs = (opArr.getDouble(0) * 1000).toLong()
                            val endMs = (opArr.getDouble(1) * 1000).toLong()
                            if (endMs > startMs) {
                                skipIntroRange = Pair(startMs, endMs)
                                Log.i("PlayerActivity", "AniSkip Intro loaded: $startMs ms -> $endMs ms")
                            }
                        }
                    }
                    skipObj.optJSONArray("ed")?.let { edArr ->
                        if (edArr.length() >= 2) {
                            val startMs = (edArr.getDouble(0) * 1000).toLong()
                            val endMs = (edArr.getDouble(1) * 1000).toLong()
                            if (endMs > startMs) {
                                skipOutroRange = Pair(startMs, endMs)
                                Log.i("PlayerActivity", "AniSkip Outro loaded: $startMs ms -> $endMs ms")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("PlayerActivity", "Failed to fetch AniSkip intervals", e)
                }
            }
        }

        // Auto-hide controls after 3.5s
        LaunchedEffect(controlsVisible, playerState.isPlaying) {
            if (controlsVisible && playerState.isPlaying) {
                delay(3500L)
                controlsVisible = false
            }
        }

        // Auto-clear double tap visual
        LaunchedEffect(activeDoubleTap) {
            if (activeDoubleTap != null) {
                delay(600L)
                activeDoubleTap = null
            }
        }

        if (isLandscape) {
            // ─────────── LANDSCAPE: True fullscreen ───────────
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                AndroidView(
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            player = media3Manager.getPlayer()
                            useController = false
                            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                PlayerGestureDetector(
                    modifier = Modifier.fillMaxSize(),
                    onSingleTap = { controlsVisible = !controlsVisible },
                    onDoubleTapSeek = { offsetMs -> media3Manager.seekRelative(offsetMs) },
                    onDoubleTapVisual = { rip -> activeDoubleTap = rip }
                ) {
                    CrunchyrollPlayerControls(
                        animeTitle = animeTitle,
                        episodeTitle = epName,
                        episodeNum = epNum,
                        isDub = isDub,
                        playerState = playerState,
                        controlsVisible = controlsVisible && !isPipMode,
                        hasNextEpisode = currentEpIndex + 1 < episodesList.size,
                        isLandscape = true,
                        activeDoubleTap = activeDoubleTap,
                        skipIntroRange = skipIntroRange,
                        skipOutroRange = skipOutroRange,
                        onToggleControls = { controlsVisible = !controlsVisible },
                        onBack = { finish() },
                        onPlayPause = { media3Manager.togglePlayPause() },
                        onSeekRelative = { offsetMs -> media3Manager.seekRelative(offsetMs) },
                        onSeekTo = { posMs -> media3Manager.seekTo(posMs) },
                        onNextEpisode = { playNextEpisode() },
                        onToggleDub = { isDub = !isDub; loadStreamAndPlay() },
                        onToggleFullscreen = { exitFullscreen() },
                        onSelectQuality = { q -> media3Manager.setQuality(q) },
                        onSelectSpeed = { s -> media3Manager.setPlaybackSpeed(s) },
                        onSkipIntro = { skipIntroRange?.second?.let { media3Manager.seekTo(it) } },
                        onSkipOutro = { skipOutroRange?.second?.let { media3Manager.seekTo(it) } }
                    )
                }
            }
        } else {
            // ─────────── PORTRAIT: 16:9 video top + info below ───────────
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BackgroundBlack)
            ) {
                // 16:9 video area with controls overlay
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 9f)
                        .background(Color.Black)
                ) {
                    AndroidView(
                        factory = { ctx ->
                            PlayerView(ctx).apply {
                                player = media3Manager.getPlayer()
                                useController = false
                                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    PlayerGestureDetector(
                        modifier = Modifier.fillMaxSize(),
                        onSingleTap = { controlsVisible = !controlsVisible },
                        onDoubleTapSeek = { offsetMs -> media3Manager.seekRelative(offsetMs) },
                        onDoubleTapVisual = { rip -> activeDoubleTap = rip }
                    ) {
                        CrunchyrollPlayerControls(
                            animeTitle = animeTitle,
                            episodeTitle = epName,
                            episodeNum = epNum,
                            isDub = isDub,
                            playerState = playerState,
                            controlsVisible = controlsVisible && !isPipMode,
                            hasNextEpisode = currentEpIndex + 1 < episodesList.size,
                            isLandscape = false,
                            activeDoubleTap = activeDoubleTap,
                            skipIntroRange = skipIntroRange,
                            skipOutroRange = skipOutroRange,
                            onToggleControls = { controlsVisible = !controlsVisible },
                            onBack = { finish() },
                            onPlayPause = { media3Manager.togglePlayPause() },
                            onSeekRelative = { offsetMs -> media3Manager.seekRelative(offsetMs) },
                            onSeekTo = { posMs -> media3Manager.seekTo(posMs) },
                            onNextEpisode = { playNextEpisode() },
                            onToggleDub = { isDub = !isDub; loadStreamAndPlay() },
                            onToggleFullscreen = { goFullscreen() },
                            onSelectQuality = { q -> media3Manager.setQuality(q) },
                            onSelectSpeed = { s -> media3Manager.setPlaybackSpeed(s) },
                            onSkipIntro = { skipIntroRange?.second?.let { media3Manager.seekTo(it) } },
                            onSkipOutro = { skipOutroRange?.second?.let { media3Manager.seekTo(it) } }
                        )
                    }
                }

                // Scrollable content below the video
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .background(BackgroundBlack)
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Episode title
                    Text(
                        text = animeTitle,
                        color = TextPrimary,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    val epLabel = buildString {
                        if (epNum.isNotEmpty()) append("Episode $epNum")
                        if (epName.isNotEmpty()) {
                            if (isNotEmpty()) append(" – ")
                            append(epName)
                        }
                    }
                    if (epLabel.isNotEmpty()) {
                        Text(
                            text = epLabel,
                            color = CrunchyOrange,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                        )
                    }

                    // "Up Next" card
                    val nextEp = if (currentEpIndex + 1 < episodesList.size)
                        episodesList[currentEpIndex + 1] else null
                    if (nextEp != null) {
                        Text(
                            text = "Up Next",
                            color = TextSecondary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        UpNextCard(
                            animeTitle = animeTitle,
                            poster = animePoster,
                            nextEp = nextEp,
                            onClick = { playNextEpisode() }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // View All Episodes button
                    Surface(
                        onClick = { openDetailScreen() },
                        shape = RoundedCornerShape(8.dp),
                        color = SurfaceDark,
                        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "View All Episodes",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(vertical = 14.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
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
            } catch (e: Exception) { /* ignore */ }
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
        lifecycleScope.launch { saveCurrentProgress() }
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

@Composable
private fun UpNextCard(
    animeTitle: String,
    poster: String,
    nextEp: JSONObject,
    onClick: () -> Unit
) {
    val nextNum = nextEp.optString("num", "")
    val nextName = nextEp.optString("name", "")

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = SurfaceDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
        modifier = androidx.compose.ui.Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = androidx.compose.ui.Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = androidx.compose.ui.Modifier
                    .width(100.dp)
                    .height(60.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(SurfaceElevated)
            ) {
                if (poster.isNotEmpty()) {
                    AsyncImage(
                        model = poster,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = androidx.compose.ui.Modifier.fillMaxSize()
                    )
                }
                Box(
                    modifier = androidx.compose.ui.Modifier
                        .size(28.dp)
                        .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        .align(Alignment.Center)
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Play",
                        tint = CrunchyOrange,
                        modifier = androidx.compose.ui.Modifier
                            .size(18.dp)
                            .align(Alignment.Center)
                    )
                }
            }

            Column(
                modifier = androidx.compose.ui.Modifier
                    .weight(1f)
                    .padding(start = 10.dp)
            ) {
                Text(
                    text = animeTitle,
                    color = TextSecondary,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = if (nextNum.isNotEmpty()) "Episode $nextNum" else "Next Episode",
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                if (nextName.isNotEmpty()) {
                    Text(
                        text = nextName,
                        color = TextMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
