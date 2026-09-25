package com.shinsei.anime.ui.player

import android.app.Activity
import android.content.Context
import android.media.AudioManager
import android.view.WindowManager
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import kotlin.math.abs

enum class GestureType {
    NONE, BRIGHTNESS, VOLUME, SCRUB
}

data class DoubleTapRipple(
    val isForward: Boolean,
    val position: Offset,
    val key: Long = System.currentTimeMillis()
)

@Composable
fun PlayerGestureDetector(
    modifier: Modifier = Modifier,
    onSingleTap: () -> Unit,
    onDoubleTapSeek: (offsetMs: Long) -> Unit,
    onScrubSeek: (deltaMs: Long) -> Unit,
    onScrubCommit: () -> Unit,
    onBrightnessChange: (Float) -> Unit,
    onVolumeChange: (Float) -> Unit,
    onDoubleTapVisual: (DoubleTapRipple) -> Unit,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    val audioManager = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    val maxVolume = remember { audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC).toFloat() }

    var currentGesture by remember { mutableStateOf(GestureType.NONE) }
    var touchStartX by remember { mutableFloatStateOf(0f) }
    var totalDragY by remember { mutableFloatStateOf(0f) }
    var totalDragX by remember { mutableFloatStateOf(0f) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        onSingleTap()
                    },
                    onDoubleTap = { offset ->
                        val isRightHalf = offset.x > size.width / 2f
                        val seekOffset = if (isRightHalf) 10_000L else -10_000L
                        onDoubleTapSeek(seekOffset)
                        onDoubleTapVisual(DoubleTapRipple(isForward = isRightHalf, position = offset))
                    }
                )
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        touchStartX = offset.x
                        totalDragY = 0f
                        totalDragX = 0f
                        currentGesture = GestureType.NONE
                    },
                    onDragEnd = {
                        if (currentGesture == GestureType.SCRUB) {
                            onScrubCommit()
                        }
                        currentGesture = GestureType.NONE
                    },
                    onDragCancel = {
                        currentGesture = GestureType.NONE
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        totalDragX += dragAmount.x
                        totalDragY += dragAmount.y

                        val isHorizontal = abs(totalDragX) > abs(totalDragY)

                        if (currentGesture == GestureType.NONE) {
                            if (abs(totalDragX) > 40f || abs(totalDragY) > 40f) {
                                currentGesture = if (isHorizontal) {
                                    GestureType.SCRUB
                                } else {
                                    if (touchStartX < size.width / 2f) GestureType.BRIGHTNESS else GestureType.VOLUME
                                }
                            }
                        }

                        when (currentGesture) {
                            GestureType.BRIGHTNESS -> {
                                val delta = -dragAmount.y / (size.height * 0.75f)
                                val activity = context as? Activity
                                if (activity != null) {
                                    val lp = activity.window.attributes
                                    val cur = if (lp.screenBrightness < 0f) 0.5f else lp.screenBrightness
                                    val newBrightness = (cur + delta).coerceIn(0.01f, 1.0f)
                                    lp.screenBrightness = newBrightness
                                    activity.window.attributes = lp
                                    onBrightnessChange(newBrightness)
                                }
                            }
                            GestureType.VOLUME -> {
                                val delta = -dragAmount.y / (size.height * 0.75f)
                                val curVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat()
                                val newVolFloat = (curVol + (delta * maxVolume)).coerceIn(0f, maxVolume)
                                audioManager.setStreamVolume(
                                    AudioManager.STREAM_MUSIC,
                                    newVolFloat.toInt(),
                                    0
                                )
                                onVolumeChange(newVolFloat / maxVolume)
                            }
                            GestureType.SCRUB -> {
                                val scrubDeltaMs = (dragAmount.x / size.width) * 90_000L
                                onScrubSeek(scrubDeltaMs.toLong())
                            }
                            GestureType.NONE -> {}
                        }
                    }
                )
            }
    ) {
        content()
    }
}
