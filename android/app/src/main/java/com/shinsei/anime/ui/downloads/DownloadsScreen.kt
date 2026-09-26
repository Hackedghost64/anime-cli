package com.shinsei.anime.ui.downloads

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.DownloadForOffline
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.download.DownloadManager
import com.shinsei.anime.data.local.DownloadEntity
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.CrunchyOrange
import com.shinsei.anime.ui.theme.SurfaceBorder
import com.shinsei.anime.ui.theme.SurfaceDark
import com.shinsei.anime.ui.theme.SurfaceElevated
import com.shinsei.anime.ui.theme.TextMuted
import com.shinsei.anime.ui.theme.TextPrimary
import com.shinsei.anime.ui.theme.TextSecondary

data class SeriesDownloadGroup(
    val animeId: String,
    val animeTitle: String,
    val animePoster: String,
    val episodes: List<DownloadEntity>,
    val totalSizeBytes: Long
)

@Composable
fun DownloadsScreen(
    onPlayOffline: (DownloadEntity) -> Unit,
    onNavigateToBrowse: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as ShinseiApp
    val downloadDao = app.database.downloadDao()
    val downloadManager = DownloadManager.getInstance(context)

    val downloads by downloadDao.observeAllDownloads().collectAsState(initial = emptyList())
    val activeDownload by downloadManager.currentDownload.collectAsState()

    // Show series card as soon as any episode is queued, downloading, or completed
    val relevantDownloads = downloads.filter {
        it.status == DownloadEntity.STATUS_COMPLETED ||
        it.status == DownloadEntity.STATUS_DOWNLOADING ||
        it.status == DownloadEntity.STATUS_QUEUED
    }
    val completedDownloads = relevantDownloads.filter { it.status == DownloadEntity.STATUS_COMPLETED }
    val totalSizeMb = completedDownloads.sumOf { it.fileSize } / (1024 * 1024)

    var viewingSeriesId by remember { mutableStateOf<String?>(null) }

    val groupedSeries = remember(relevantDownloads) {
        relevantDownloads.groupBy { it.animeId }.map { (animeId, eps) ->
            SeriesDownloadGroup(
                animeId = animeId,
                animeTitle = eps.firstOrNull()?.animeTitle ?: "Anime",
                animePoster = eps.firstOrNull()?.animePoster ?: "",
                episodes = eps.sortedWith(compareBy { ep ->
                    // Sort numerically by episode number
                    ep.epNum.replace(Regex("[^0-9]"), "").toIntOrNull() ?: 0
                }),
                totalSizeBytes = eps.sumOf { it.fileSize }
            )
        }
    }

    val selectedGroup = groupedSeries.find { it.animeId == viewingSeriesId }
    if (viewingSeriesId != null && selectedGroup == null) {
        viewingSeriesId = null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundBlack)
            .statusBarsPadding()
    ) {
        // Header
        if (selectedGroup != null) {
            // Series detail view header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { viewingSeriesId = null }) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = selectedGroup.animeTitle,
                        color = TextPrimary,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${selectedGroup.episodes.size} episodes • ${selectedGroup.totalSizeBytes / (1024 * 1024)} MB",
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }
                IconButton(onClick = {
                    selectedGroup.episodes.forEach { ep ->
                        downloadManager.deleteDownload(ep.id)
                    }
                    viewingSeriesId = null
                }) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete All",
                        tint = TextMuted
                    )
                }
            }
        } else {
            // Main Downloads Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "DOWNLOADS",
                        color = TextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = if (completedDownloads.isEmpty()) "No offline videos" else "${groupedSeries.size} series • ${completedDownloads.size} episodes • ${totalSizeMb} MB",
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }

                Surface(
                    shape = CircleShape,
                    color = SurfaceElevated,
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.DownloadDone,
                            contentDescription = null,
                            tint = CrunchyOrange,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // Active In-Flight Download Card (if any)
        if (activeDownload != null && activeDownload!!.status == DownloadEntity.STATUS_DOWNLOADING) {
            val cur = activeDownload!!
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = SurfaceDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, CrunchyOrange)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "DOWNLOADING NOW",
                                color = CrunchyOrange,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "${cur.animeTitle} - Ep ${cur.epNum}",
                                color = TextPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        IconButton(
                            onClick = { downloadManager.deleteDownload(cur.id) },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Cancel",
                                tint = TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { cur.progress / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = CrunchyOrange,
                        trackColor = SurfaceElevated
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${cur.progress}% complete",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                        val mb = cur.fileSize / (1024 * 1024)
                        Text(
                            text = if (mb > 0) "${mb} MB" else "Preparing chunks...",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        // Empty state vs Series List vs Episodes List
        if (relevantDownloads.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.DownloadForOffline,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No Offline Downloads Yet",
                        color = TextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Download anime episodes to watch anywhere without Wi-Fi or cellular data.",
                        color = TextSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onNavigateToBrowse,
                        colors = ButtonDefaults.buttonColors(containerColor = CrunchyOrange),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Browse Anime",
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        } else if (selectedGroup != null) {
            // Viewing Episodes of the Selected Series
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(selectedGroup.episodes, key = { it.id }) { item ->
                    DownloadedEpisodeCard(
                        item = item,
                        onPlay = { onPlayOffline(item) },
                        onDelete = { downloadManager.deleteDownload(item.id) }
                    )
                }
            }
        } else {
            // Viewing Grouped Series Cards
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(groupedSeries, key = { it.animeId }) { group ->
                    DownloadedSeriesCard(
                        group = group,
                        onClick = { viewingSeriesId = group.animeId },
                        onDeleteAll = {
                            group.episodes.forEach { ep ->
                                downloadManager.deleteDownload(ep.id)
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun DownloadedSeriesCard(
    group: SeriesDownloadGroup,
    onClick: () -> Unit,
    onDeleteAll: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = SurfaceDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Series Poster
            Box(
                modifier = Modifier
                    .size(width = 65.dp, height = 90.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceElevated),
                contentAlignment = Alignment.Center
            ) {
                if (group.animePoster.isNotEmpty()) {
                    AsyncImage(
                        model = group.animePoster,
                        contentDescription = group.animeTitle,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            // Series Details
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = group.animeTitle,
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${group.episodes.size} ${if (group.episodes.size == 1) "Episode" else "Episodes"}",
                    color = CrunchyOrange,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(2.dp))
                val sizeMb = group.totalSizeBytes / (1024 * 1024)
                Text(
                    text = "$sizeMb MB on device",
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }

            // Chevron to indicate opening episodes
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "View Episodes",
                tint = TextSecondary,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
private fun DownloadedEpisodeCard(
    item: DownloadEntity,
    onPlay: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onPlay),
        shape = RoundedCornerShape(12.dp),
        color = SurfaceDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Poster thumbnail
            Box(
                modifier = Modifier
                    .size(width = 80.dp, height = 54.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceElevated),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = item.animePoster,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                // Small play overlay
                Surface(
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.6f),
                    modifier = Modifier.size(24.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Episode info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Episode ${item.epNum}",
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (item.epName.isNotEmpty() && item.epName != "Episode ${item.epNum}") {
                    Text(
                        text = item.epName,
                        color = TextSecondary,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                when (item.status) {
                    DownloadEntity.STATUS_COMPLETED -> {
                        val sizeMb = item.fileSize / (1024 * 1024)
                        Text(
                            text = "${sizeMb} MB • Ready Offline",
                            color = CrunchyOrange,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    DownloadEntity.STATUS_DOWNLOADING -> {
                        Text(
                            text = "Downloading (${item.progress}%)",
                            color = CrunchyOrange,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    DownloadEntity.STATUS_QUEUED -> {
                        Text(
                            text = "Queued for download",
                            color = TextMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    else -> {
                        Text(
                            text = item.status,
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // Delete action
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = TextMuted,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
