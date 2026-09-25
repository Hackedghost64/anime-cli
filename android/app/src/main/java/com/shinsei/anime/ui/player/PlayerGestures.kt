package com.shinsei.anime.ui.player

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput

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
    onDoubleTapVisual: (DoubleTapRipple) -> Unit,
    content: @Composable () -> Unit
) {
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
    ) {
        content()
    }
}
