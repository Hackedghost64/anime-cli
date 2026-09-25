package com.shinsei.anime.ui.player

import android.content.Context
import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.MediaSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class PlayerState(
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val currentPosition: Long = 0L,
    val duration: Long = 0L,
    val bufferedPosition: Long = 0L,
    val playbackSpeed: Float = 1.0f,
    val availableQualities: List<VideoQuality> = emptyList(),
    val selectedQuality: VideoQuality? = null,
    val error: String? = null
)

data class VideoQuality(
    val height: Int,
    val bitrate: Int,
    val label: String,
    val trackGroupIndex: Int,
    val trackIndex: Int
)

@OptIn(UnstableApi::class)
class Media3Manager(
    private val context: Context,
    private val coroutineScope: CoroutineScope
) {
    private var exoPlayer: ExoPlayer? = null
    private var progressJob: Job? = null

    private val _playerState = MutableStateFlow(PlayerState())
    val playerState = _playerState.asStateFlow()

    fun getPlayer(): ExoPlayer {
        return exoPlayer ?: createPlayer().also { exoPlayer = it }
    }

    private fun createPlayer(): ExoPlayer {
        // Optimized 2.5s start buffer and 30s max buffer for instantaneous streaming
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                15_000, // minBufferMs
                30_000, // maxBufferMs
                2_500,  // bufferForPlaybackMs (instant start)
                4_000   // bufferForPlaybackAfterRebufferMs
            )
            .setPrioritizeTimeOverSizeThresholds(true)
            .build()

        val player = ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .setSeekBackIncrementMs(10_000)
            .setSeekForwardIncrementMs(10_000)
            .build()

        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _playerState.value = _playerState.value.copy(isPlaying = isPlaying)
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                val isBuffering = playbackState == Player.STATE_BUFFERING
                val duration = if (player.duration > 0) player.duration else 0L
                _playerState.value = _playerState.value.copy(
                    isBuffering = isBuffering,
                    duration = duration
                )
            }

            override fun onTracksChanged(tracks: Tracks) {
                extractQualities(tracks)
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                _playerState.value = _playerState.value.copy(error = error.localizedMessage)
            }
        })

        startProgressUpdates(player)
        return player
    }

    fun prepareMedia(
        url: String,
        headers: Map<String, String> = emptyMap(),
        initialPositionMs: Long = 0L
    ) {
        val player = getPlayer()

        if (url.startsWith("/") || url.startsWith("file://") || !url.startsWith("http")) {
            val uri = if (url.startsWith("file://")) Uri.parse(url) else Uri.fromFile(java.io.File(url))
            val mediaItem = MediaItem.fromUri(uri)
            player.setMediaItem(mediaItem)
        } else {
            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(15000)

            val ua = headers["User-Agent"] ?: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            httpDataSourceFactory.setUserAgent(ua)

            if (headers.isNotEmpty()) {
                httpDataSourceFactory.setDefaultRequestProperties(headers)
            }

            val hlsMediaSource: MediaSource = HlsMediaSource.Factory(httpDataSourceFactory)
                .setAllowChunklessPreparation(true)
                .createMediaSource(MediaItem.fromUri(Uri.parse(url)))

            player.setMediaSource(hlsMediaSource)
        }

        player.prepare()
        if (initialPositionMs > 1000L) {
            player.seekTo(initialPositionMs)
        }
        player.playWhenReady = true
    }

    fun prepareHlsStream(
        m3u8Url: String,
        headers: Map<String, String> = emptyMap(),
        initialPositionMs: Long = 0L
    ) {
        prepareMedia(m3u8Url, headers, initialPositionMs)
    }

    private fun startProgressUpdates(player: ExoPlayer) {
        progressJob?.cancel()
        progressJob = coroutineScope.launch(Dispatchers.Main) {
            while (isActive) {
                val curPos = player.currentPosition
                val dur = if (player.duration > 0) player.duration else 0L
                val bufPos = player.bufferedPosition

                _playerState.value = _playerState.value.copy(
                    currentPosition = curPos,
                    duration = dur,
                    bufferedPosition = bufPos
                )
                delay(200)
            }
        }
    }

    private fun extractQualities(tracks: Tracks) {
        val qualities = mutableListOf<VideoQuality>()
        for (groupIndex in 0 until tracks.groups.size) {
            val group = tracks.groups[groupIndex]
            if (group.type == C.TRACK_TYPE_VIDEO) {
                for (trackIndex in 0 until group.length) {
                    val format = group.getTrackFormat(trackIndex)
                    val h = format.height
                    val bitrate = format.bitrate
                    val label = if (h > 0) "${h}p" else if (bitrate > 0) "${bitrate / 1000}k" else "Auto"
                    qualities.add(
                        VideoQuality(
                            height = h,
                            bitrate = bitrate,
                            label = label,
                            trackGroupIndex = groupIndex,
                            trackIndex = trackIndex
                        )
                    )
                }
            }
        }
        _playerState.value = _playerState.value.copy(availableQualities = qualities)
    }

    fun setQuality(quality: VideoQuality?) {
        val player = exoPlayer ?: return
        if (quality == null) {
            // Auto
            player.trackSelectionParameters = player.trackSelectionParameters
                .buildUpon()
                .clearOverridesOfType(C.TRACK_TYPE_VIDEO)
                .build()
            _playerState.value = _playerState.value.copy(selectedQuality = null)
        } else {
            val trackGroups = player.currentTracks.groups
            if (quality.trackGroupIndex < trackGroups.size) {
                val group = trackGroups[quality.trackGroupIndex].mediaTrackGroup
                player.trackSelectionParameters = player.trackSelectionParameters
                    .buildUpon()
                    .setOverrideForType(TrackSelectionOverride(group, quality.trackIndex))
                    .build()
                _playerState.value = _playerState.value.copy(selectedQuality = quality)
            }
        }
    }

    fun play() {
        exoPlayer?.play()
    }

    fun pause() {
        exoPlayer?.pause()
    }

    fun togglePlayPause() {
        val p = exoPlayer ?: return
        if (p.isPlaying) p.pause() else p.play()
    }

    fun seekRelative(offsetMs: Long) {
        val p = exoPlayer ?: return
        val newPos = (p.currentPosition + offsetMs).coerceIn(0L, p.duration.coerceAtLeast(0L))
        p.seekTo(newPos)
    }

    fun seekTo(positionMs: Long) {
        val p = exoPlayer ?: return
        p.seekTo(positionMs.coerceIn(0L, p.duration.coerceAtLeast(0L)))
    }

    fun setPlaybackSpeed(speed: Float) {
        exoPlayer?.playbackParameters = PlaybackParameters(speed)
        _playerState.value = _playerState.value.copy(playbackSpeed = speed)
    }

    fun release() {
        progressJob?.cancel()
        exoPlayer?.release()
        exoPlayer = null
    }
}
