package com.shinsei.anime.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.shinsei.anime.data.model.EpisodeItem
import com.shinsei.anime.ui.theme.AmberGlow
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.CrunchyOrange
import com.shinsei.anime.ui.theme.LiveGreen
import com.shinsei.anime.ui.theme.PlayerTopScrim
import com.shinsei.anime.ui.theme.SurfaceBorder
import com.shinsei.anime.ui.theme.SurfaceDark
import com.shinsei.anime.ui.theme.SurfaceElevated
import com.shinsei.anime.ui.theme.TextMuted
import com.shinsei.anime.ui.theme.TextPrimary
import com.shinsei.anime.ui.theme.TextSecondary

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(
    animeId: String,
    viewModel: DetailViewModel,
    onBack: () -> Unit,
    onPlayEpisode: (
        animeId: String,
        animeTitle: String,
        animePoster: String,
        episode: EpisodeItem,
        episodesJson: String,
        isDub: Boolean,
        malId: Long
    ) -> Unit
) {
    LaunchedEffect(animeId) {
        viewModel.loadAnime(animeId)
    }

    val uiState by viewModel.uiState.collectAsState()
    var isDubSelected by remember { mutableStateOf(false) }
    var showBatchDownloadSheet by remember { mutableStateOf(false) }

    val context = androidx.compose.ui.platform.LocalContext.current
    val app = context.applicationContext as com.shinsei.anime.ShinseiApp
    val downloadManager = remember { com.shinsei.anime.data.download.DownloadManager.getInstance(context) }
    val episodeDownloads by app.database.downloadDao().observeDownloadsForAnime(animeId).collectAsState(initial = emptyList())

    if (uiState.isLoading && uiState.detail == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BackgroundBlack)
        ) {
            com.shinsei.anime.ui.common.DetailSkeletonScreen()
        }
        return
    }

    val detail = uiState.detail ?: return

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        // Hero Header with Poster & Gradient Scrim
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
            ) {
                if (detail.poster.isNotEmpty()) {
                    AsyncImage(
                        model = detail.poster,
                        contentDescription = detail.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // Gradient Vignette
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    PlayerTopScrim,
                                    Color.Transparent,
                                    BackgroundBlack
                                )
                            )
                        )
                )

                // Top Back Button
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(start = 12.dp, top = 8.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        .align(Alignment.TopStart)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = TextPrimary
                    )
                }
            }
        }

        // Title & Metadata
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    text = detail.title,
                    color = TextPrimary,
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    lineHeight = 28.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (detail.score.isNotEmpty()) {
                        Text(
                            text = "★ ${detail.score}",
                            color = AmberGlow,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(end = 12.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = SurfaceElevated
                    ) {
                        Text(
                            text = detail.type,
                            color = TextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    // Sub / Dub Selector Chip
                    Surface(
                        onClick = { isDubSelected = !isDubSelected },
                        shape = RoundedCornerShape(12.dp),
                        color = SurfaceBorder
                    ) {
                        Text(
                            text = if (isDubSelected) "AUDIO: DUB" else "AUDIO: SUB",
                            color = CrunchyOrange,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                // Genre Chips
                if (detail.genres.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        for (g in detail.genres) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = SurfaceDark,
                                border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder)
                            ) {
                                Text(
                                    text = g,
                                    color = TextMuted,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }

                // Primary Play / Resume Action Button
                Spacer(modifier = Modifier.height(16.dp))
                val targetEp = uiState.resumeEpisode ?: uiState.episodes.firstOrNull()
                val btnLabel = if (uiState.resumeEpisode != null) {
                    "RESUME EPISODE ${targetEp?.num}"
                } else {
                    "START WATCHING EPISODE 1"
                }

                Button(
                    onClick = {
                        if (targetEp != null) {
                            onPlayEpisode(
                                detail.id,
                                detail.title,
                                detail.poster,
                                targetEp,
                                uiState.rawEpisodesJson,
                                isDubSelected,
                                detail.malId
                            )
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CrunchyOrange)
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        tint = Color.Black,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = btnLabel,
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        letterSpacing = 1.sp
                    )
                }

                // Synopsis
                if (detail.synopsis.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = detail.synopsis,
                        color = TextSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Episodes Section Header
                Spacer(modifier = Modifier.height(24.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Episodes (${uiState.episodes.size})",
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp
                    )

                    if (uiState.episodes.isNotEmpty()) {
                        Surface(
                            onClick = { showBatchDownloadSheet = true },
                            shape = RoundedCornerShape(8.dp),
                            color = SurfaceElevated,
                            border = androidx.compose.foundation.BorderStroke(1.dp, CrunchyOrange)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Download,
                                    contentDescription = null,
                                    tint = CrunchyOrange,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "DOWNLOAD BATCH",
                                    color = CrunchyOrange,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp,
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }

        // Episode List Items
        items(uiState.episodes) { ep ->
            val progress = uiState.progressMap[ep.id]
            val isWatched = progress != null && progress.duration > 0 &&
                    (progress.position / progress.duration) >= 0.88

            Surface(
                onClick = {
                    onPlayEpisode(
                        detail.id,
                        detail.title,
                        detail.poster,
                        ep,
                        uiState.rawEpisodesJson,
                        isDubSelected,
                        detail.malId
                    )
                },
                color = SurfaceDark,
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 5.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Episode Number Badge
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(SurfaceElevated, RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = ep.num,
                            color = CrunchyOrange,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = ep.name.ifEmpty { "Episode ${ep.num}" },
                            color = TextPrimary,
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (ep.duration.isNotEmpty()) {
                            Text(
                                text = ep.duration,
                                color = TextMuted,
                                fontSize = 11.sp
                            )
                        }
                    }

                    if (isWatched) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Watched",
                            tint = LiveGreen,
                            modifier = Modifier.size(20.dp)
                        )
                    } else if (progress != null && progress.position > 10) {
                        val mins = (progress.position / 60).toInt()
                        Text(
                            text = "${mins}m left",
                            color = CrunchyOrange,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Offline Download Action / Status
                    val dl = episodeDownloads.find { it.epId == ep.id }
                    when {
                        dl?.status == com.shinsei.anime.data.local.DownloadEntity.STATUS_COMPLETED -> {
                            Icon(
                                imageVector = Icons.Default.DownloadDone,
                                contentDescription = "Downloaded Offline",
                                tint = CrunchyOrange,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        dl?.status == com.shinsei.anime.data.local.DownloadEntity.STATUS_DOWNLOADING -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = CrunchyOrange,
                                strokeWidth = 2.dp
                            )
                        }
                        else -> {
                            IconButton(
                                onClick = {
                                    downloadManager.enqueueDownload(
                                        animeId = animeId,
                                        animeTitle = detail.title,
                                        animePoster = detail.poster,
                                        epId = ep.id,
                                        epNum = ep.num,
                                        epName = ep.name,
                                        isDub = isDubSelected
                                    )
                                    android.widget.Toast.makeText(context, "Downloading Ep ${ep.num} in background", android.widget.Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Download,
                                    contentDescription = "Download Episode",
                                    tint = TextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showBatchDownloadSheet) {
        val downloadDao = app.database.downloadDao()
        val downloadStatuses = remember(episodeDownloads) {
            episodeDownloads.associate { it.epId to it.status }
        }
        val unDownloadedEpisodes = remember(uiState.episodes, downloadStatuses) {
            uiState.episodes.filter { ep ->
                val status = downloadStatuses[ep.id]
                status == null || status == com.shinsei.anime.data.local.DownloadEntity.STATUS_FAILED || status == com.shinsei.anime.data.local.DownloadEntity.STATUS_CANCELLED
            }
        }

        ModalBottomSheet(
            onDismissRequest = { showBatchDownloadSheet = false },
            containerColor = SurfaceDark
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "Batch Download Episodes",
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Queue multiple episodes for offline playback",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
                )

                val options = listOf(
                    "Next 5 Episodes" to 5,
                    "Next 10 Episodes" to 10,
                    "All Remaining Episodes (${unDownloadedEpisodes.size})" to unDownloadedEpisodes.size
                )

                options.forEach { (label, count) ->
                    val actualCount = minOf(count, unDownloadedEpisodes.size)
                    val isEnabled = actualCount > 0
                    Surface(
                        onClick = {
                            if (isEnabled) {
                                showBatchDownloadSheet = false
                                val toQueue = unDownloadedEpisodes.take(actualCount).map { Pair(it.id, it.num) }
                                if (toQueue.isNotEmpty()) {
                                    downloadManager.queueBatchDownloads(
                                        animeId = detail.id,
                                        animeTitle = detail.title,
                                        animePoster = detail.poster,
                                        episodes = toQueue,
                                        isDub = isDubSelected
                                    )
                                    android.widget.Toast.makeText(
                                        context,
                                        "Queued ${toQueue.size} episodes for download",
                                        android.widget.Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        color = if (isEnabled) SurfaceElevated else SurfaceDark,
                        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = label,
                                color = if (isEnabled) TextPrimary else TextMuted,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                            Icon(
                                imageVector = Icons.Default.Download,
                                contentDescription = null,
                                tint = if (isEnabled) CrunchyOrange else TextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
