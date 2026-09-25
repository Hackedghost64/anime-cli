package com.shinsei.anime.ui.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BrightnessMedium
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shinsei.anime.ui.theme.CrunchyOrange
import com.shinsei.anime.ui.theme.PlayerBottomScrim
import com.shinsei.anime.ui.theme.PlayerTopScrim
import com.shinsei.anime.ui.theme.SurfaceBorder
import com.shinsei.anime.ui.theme.SurfaceDark
import com.shinsei.anime.ui.theme.TextMuted
import com.shinsei.anime.ui.theme.TextPrimary
import com.shinsei.anime.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrunchyrollPlayerControls(
    modifier: Modifier = Modifier,
    animeTitle: String,
    episodeTitle: String,
    episodeNum: String,
    isDub: Boolean,
    playerState: PlayerState,
    controlsVisible: Boolean,
    hasNextEpisode: Boolean,
    isZoomMode: Boolean,
    activeDoubleTap: DoubleTapRipple?,
    activeVolume: Float?,
    activeBrightness: Float?,
    skipIntroRange: Pair<Long, Long>?,
    skipOutroRange: Pair<Long, Long>?,
    onToggleControls: () -> Unit,
    onBack: () -> Unit,
    onPlayPause: () -> Unit,
    onSeekRelative: (Long) -> Unit,
    onSeekTo: (Long) -> Unit,
    onNextEpisode: () -> Unit,
    onToggleDub: () -> Unit,
    onToggleZoom: () -> Unit,
    onSelectQuality: (VideoQuality?) -> Unit,
    onSelectSpeed: (Float) -> Unit,
    onSkipIntro: () -> Unit,
    onSkipOutro: () -> Unit
) {
    var showSettingsSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var isDraggingSlider by remember { mutableStateOf(false) }
    var sliderDragPosition by remember { mutableFloatStateOf(0f) }

    val curPos = if (isDraggingSlider) sliderDragPosition.toLong() else playerState.currentPosition
    val duration = playerState.duration.coerceAtLeast(1L)

    // Check if Skip Intro or Skip Outro is active
    val showSkipIntro = skipIntroRange != null &&
            curPos >= skipIntroRange.first && curPos <= skipIntroRange.second
    val showSkipOutro = skipOutroRange != null &&
            curPos >= skipOutroRange.first && curPos <= skipOutroRange.second

    Box(
        modifier = modifier.fillMaxSize()
    ) {
        // 1. Double-tap Ripple Visual
        if (activeDoubleTap != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .align(if (activeDoubleTap.isForward) Alignment.CenterEnd else Alignment.CenterStart)
            ) {
                DoubleTapRippleIndicator(isForward = activeDoubleTap.isForward)
            }
        }

        // 2. Gesture Level Indicators (Brightness / Volume)
        if (activeVolume != null) {
            VerticalLevelIndicator(
                icon = Icons.Default.VolumeUp,
                level = activeVolume,
                label = "${(activeVolume * 100).toInt()}%",
                modifier = Modifier.align(Alignment.Center)
            )
        } else if (activeBrightness != null) {
            VerticalLevelIndicator(
                icon = Icons.Default.BrightnessMedium,
                level = activeBrightness,
                label = "${(activeBrightness * 100).toInt()}%",
                modifier = Modifier.align(Alignment.Center)
            )
        }

        // 3. Floating "Skip Intro" / "Skip Outro" Button (always visible during range even if controls are hidden)
        if (showSkipIntro || showSkipOutro) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = if (controlsVisible) 84.dp else 24.dp, end = 24.dp),
                contentAlignment = Alignment.BottomEnd
            ) {
                Surface(
                    onClick = { if (showSkipIntro) onSkipIntro() else onSkipOutro() },
                    shape = RoundedCornerShape(20.dp),
                    color = Color.Black.copy(alpha = 0.85f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, CrunchyOrange),
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "⚡",
                            fontSize = 14.sp,
                            modifier = Modifier.padding(end = 6.dp)
                        )
                        Text(
                            text = if (showSkipIntro) "SKIP INTRO" else "SKIP OUTRO",
                            color = CrunchyOrange,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }

        // 4. Main Overlay Controls (Top Bar, Center 3-buttons, Bottom Bar)
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(tween(250)),
            exit = fadeOut(tween(250))
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                // Top Gradient Scrim
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(PlayerTopScrim, Color.Transparent)
                            )
                        )
                        .align(Alignment.TopCenter)
                )

                // Bottom Gradient Scrim
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(130.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, PlayerBottomScrim)
                            )
                        )
                        .align(Alignment.BottomCenter)
                )

                // TOP BAR: [←] "Anime Title" E5 - "Ep Name"  [SUB/DUB] [⏭ Next] [⚙] [⤢]
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .align(Alignment.TopCenter),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = animeTitle,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val epLabel = if (episodeNum.isNotEmpty()) "E$episodeNum" else ""
                        val combinedSubtitle = listOf(epLabel, episodeTitle).filter { it.isNotEmpty() }.joinToString(" - ")
                        if (combinedSubtitle.isNotEmpty()) {
                            Text(
                                text = combinedSubtitle,
                                color = TextSecondary,
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // SUB / DUB Toggle Chip
                    Surface(
                        onClick = onToggleDub,
                        shape = RoundedCornerShape(12.dp),
                        color = Color.White.copy(alpha = 0.15f),
                        modifier = Modifier.padding(horizontal = 6.dp)
                    ) {
                        Text(
                            text = if (isDub) "DUB" else "SUB",
                            color = CrunchyOrange,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }

                    // NEXT EPISODE BUTTON (Placed beside settings as explicitly requested!)
                    if (hasNextEpisode) {
                        IconButton(onClick = onNextEpisode) {
                            Icon(
                                imageVector = Icons.Default.SkipNext,
                                contentDescription = "Next Episode",
                                tint = TextPrimary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }

                    // SETTINGS BUTTON [⚙]
                    IconButton(onClick = { showSettingsSheet = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = TextPrimary
                        )
                    }

                    // FULLSCREEN / FIT TOGGLE [⤢]
                    IconButton(onClick = onToggleZoom) {
                        Icon(
                            imageVector = if (isZoomMode) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                            contentDescription = "Aspect Ratio",
                            tint = TextPrimary
                        )
                    }
                }

                // CENTER CONTROLS: [⏪ 10]    [ ▶ / ❚❚ ]    [10 ⏩]
                Row(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalArrangement = Arrangement.spacedBy(36.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Rewind 10s
                    IconButton(
                        onClick = { onSeekRelative(-10_000L) },
                        modifier = Modifier
                            .size(54.dp)
                            .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FastRewind,
                            contentDescription = "Rewind 10s",
                            tint = TextPrimary,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    // Center Play/Pause / Buffering Indicator
                    if (playerState.isBuffering) {
                        CircularProgressIndicator(
                            color = CrunchyOrange,
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(64.dp)
                        )
                    } else {
                        IconButton(
                            onClick = onPlayPause,
                            modifier = Modifier
                                .size(68.dp)
                                .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                        ) {
                            Icon(
                                imageVector = if (playerState.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (playerState.isPlaying) "Pause" else "Play",
                                tint = TextPrimary,
                                modifier = Modifier.size(42.dp)
                            )
                        }
                    }

                    // Forward 10s
                    IconButton(
                        onClick = { onSeekRelative(10_000L) },
                        modifier = Modifier
                            .size(54.dp)
                            .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FastForward,
                            contentDescription = "Forward 10s",
                            tint = TextPrimary,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                // BOTTOM BAR: [04:12] ━━━━━●━━━━━━━━━━━━━━━━━━ [23:40]
                // (No pause button at bottom left as explicitly requested!)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 14.dp)
                        .align(Alignment.BottomCenter),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formatTime(curPos),
                        color = TextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Slider(
                        value = curPos.toFloat().coerceIn(0f, duration.toFloat()),
                        onValueChange = {
                            isDraggingSlider = true
                            sliderDragPosition = it
                        },
                        onValueChangeFinished = {
                            isDraggingSlider = false
                            onSeekTo(sliderDragPosition.toLong())
                        },
                        valueRange = 0f..duration.toFloat(),
                        colors = SliderDefaults.colors(
                            thumbColor = CrunchyOrange,
                            activeTrackColor = CrunchyOrange,
                            inactiveTrackColor = Color.White.copy(alpha = 0.3f)
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 12.dp)
                    )

                    Text(
                        text = formatTime(duration),
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }

    // Settings Modal Sheet (Resolution & Speed)
    if (showSettingsSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSettingsSheet = false },
            sheetState = sheetState,
            containerColor = SurfaceDark
        ) {
            SettingsSheetContent(
                playerState = playerState,
                onSelectQuality = {
                    onSelectQuality(it)
                    showSettingsSheet = false
                },
                onSelectSpeed = {
                    onSelectSpeed(it)
                    showSettingsSheet = false
                }
            )
        }
    }
}

@Composable
fun SettingsSheetContent(
    playerState: PlayerState,
    onSelectQuality: (VideoQuality?) -> Unit,
    onSelectSpeed: (Float) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Text(
            text = "Video Quality",
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 10.dp)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            val isAutoSelected = playerState.selectedQuality == null
            Surface(
                onClick = { onSelectQuality(null) },
                shape = RoundedCornerShape(8.dp),
                color = if (isAutoSelected) CrunchyOrange else SurfaceBorder
            ) {
                Text(
                    text = "Auto",
                    color = if (isAutoSelected) Color.Black else TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                )
            }

            for (q in playerState.availableQualities) {
                val isSelected = playerState.selectedQuality == q
                Surface(
                    onClick = { onSelectQuality(q) },
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) CrunchyOrange else SurfaceBorder
                ) {
                    Text(
                        text = q.label,
                        color = if (isSelected) Color.Black else TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
        }

        Text(
            text = "Playback Speed",
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 10.dp)
        )

        val speeds = listOf(0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            for (s in speeds) {
                val isSelected = playerState.playbackSpeed == s
                Surface(
                    onClick = { onSelectSpeed(s) },
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) CrunchyOrange else SurfaceBorder
                ) {
                    Text(
                        text = "${s}x",
                        color = if (isSelected) Color.Black else TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun VerticalLevelIndicator(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    level: Float,
    label: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = Color.Black.copy(alpha = 0.8f),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = CrunchyOrange,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .width(6.dp)
                    .height(80.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.BottomCenter
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height((80 * level.coerceIn(0f, 1f)).dp)
                        .background(CrunchyOrange)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = label,
                color = TextPrimary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun DoubleTapRippleIndicator(
    isForward: Boolean
) {
    val animAlpha = remember { Animatable(0.7f) }
    LaunchedEffect(Unit) {
        animAlpha.animateTo(0f, animationSpec = tween(500, easing = FastOutSlowInEasing))
    }

    Box(
        modifier = Modifier
            .size(160.dp)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        CrunchyOrange.copy(alpha = animAlpha.value),
                        Color.Transparent
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = if (isForward) "+10s" else "-10s",
            color = TextPrimary.copy(alpha = animAlpha.value),
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp
        )
    }
}

private fun formatTime(ms: Long): String {
    val totalSec = ms / 1000
    val m = totalSec / 60
    val s = totalSec % 60
    return String.format("%02d:%02d", m, s)
}
