package com.shinsei.anime.ui.watchlist

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.shinsei.anime.data.local.WatchlistEntity
import com.shinsei.anime.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun WatchlistScreen(
    viewModel: WatchlistViewModel,
    onNavigateToDetail: (String) -> Unit
) {
    val watchlist by viewModel.watchlist.collectAsState()
    val selectedFilter by viewModel.selectedFilter.collectAsState()
    var selectedAnimeForStatus by remember { mutableStateOf<WatchlistEntity?>(null) }
    
    val filters = listOf(
        null to "All",
        WatchlistEntity.STATUS_WATCHING to "Watching",
        WatchlistEntity.STATUS_PLAN_TO_WATCH to "Plan to Watch",
        WatchlistEntity.STATUS_COMPLETED to "Completed",
        WatchlistEntity.STATUS_ON_HOLD to "On Hold",
        WatchlistEntity.STATUS_DROPPED to "Dropped"
    )

    Column(modifier = Modifier.fillMaxSize().background(BackgroundBlack)) {
        Text(
            text = "My List",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 8.dp)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            filters.forEach { (status, label) ->
                val isSelected = selectedFilter == status
                Surface(
                    onClick = { viewModel.setFilter(status) },
                    shape = RoundedCornerShape(16.dp),
                    color = if (isSelected) CrunchyOrange else SurfaceElevated,
                    border = if (!isSelected) BorderStroke(1.dp, SurfaceBorder) else null
                ) {
                    Text(
                        text = label,
                        color = if (isSelected) BackgroundBlack else TextSecondary,
                        fontSize = 14.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }
        }

        if (watchlist.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "No anime found",
                    color = TextMuted,
                    fontSize = 16.sp
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 140.dp),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(watchlist) { item ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .combinedClickable(
                                onClick = { onNavigateToDetail(item.animeId) },
                                onLongClick = { selectedAnimeForStatus = item }
                            )
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(0.7f)
                                .clip(RoundedCornerShape(8.dp))
                        ) {
                            AsyncImage(
                                model = item.poster,
                                contentDescription = item.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            
                            val statusColor = when (item.status) {
                                WatchlistEntity.STATUS_WATCHING -> LiveGreen
                                WatchlistEntity.STATUS_PLAN_TO_WATCH -> Color(0xFF4FC3F7)
                                WatchlistEntity.STATUS_COMPLETED -> AmberGlow
                                WatchlistEntity.STATUS_ON_HOLD -> TextMuted
                                WatchlistEntity.STATUS_DROPPED -> Color(0xFFEF5350)
                                else -> TextMuted
                            }
                            
                            val statusLabel = filters.find { it.first == item.status }?.second ?: "Unknown"
                            
                            Box(
                                modifier = Modifier
                                    .padding(8.dp)
                                    .background(BackgroundBlack.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                    .align(Alignment.TopStart)
                            ) {
                                Text(
                                    text = statusLabel.uppercase(),
                                    color = statusColor,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = item.title,
                            color = TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }

    selectedAnimeForStatus?.let { anime ->
        ModalBottomSheet(
            onDismissRequest = { selectedAnimeForStatus = null },
            containerColor = SurfaceDark
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "Set Watch Status",
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = anime.title,
                    color = TextSecondary,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(16.dp))

                data class StatusOption(val emoji: String, val status: String, val label: String)
                val options = listOf(
                    StatusOption("📺", WatchlistEntity.STATUS_WATCHING, "Watching"),
                    StatusOption("📋", WatchlistEntity.STATUS_PLAN_TO_WATCH, "Plan to Watch"),
                    StatusOption("✅", WatchlistEntity.STATUS_COMPLETED, "Completed"),
                    StatusOption("⏸\uFE0F", WatchlistEntity.STATUS_ON_HOLD, "On Hold"),
                    StatusOption("❌", WatchlistEntity.STATUS_DROPPED, "Dropped")
                )

                options.forEach { opt ->
                    Surface(
                        onClick = {
                            viewModel.updateStatus(anime.animeId, opt.status)
                            selectedAnimeForStatus = null
                        },
                        shape = RoundedCornerShape(10.dp),
                        color = SurfaceElevated,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(opt.emoji, fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(opt.label, color = TextPrimary, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    onClick = {
                        viewModel.removeFromWatchlist(anime.animeId)
                        selectedAnimeForStatus = null
                    },
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF2D1515),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🗑\uFE0F", fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Remove from My List", color = Color(0xFFEF5350), fontWeight = FontWeight.Medium, fontSize = 15.sp)
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
