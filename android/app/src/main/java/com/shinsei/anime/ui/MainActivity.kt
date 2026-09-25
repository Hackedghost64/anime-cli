package com.shinsei.anime.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.shinsei.anime.data.local.DownloadEntity
import com.shinsei.anime.data.local.WatchProgressEntity
import com.shinsei.anime.data.model.EpisodeItem
import com.shinsei.anime.ui.browse.BrowseScreen
import com.shinsei.anime.ui.detail.DetailScreen
import com.shinsei.anime.ui.detail.DetailViewModel
import com.shinsei.anime.ui.downloads.DownloadsScreen
import com.shinsei.anime.ui.home.HomeScreen
import com.shinsei.anime.ui.home.HomeViewModel
import com.shinsei.anime.ui.player.PlayerActivity
import com.shinsei.anime.ui.sync.QrScannerSheet
import com.shinsei.anime.ui.sync.SyncScreen
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.CrunchyOrange
import com.shinsei.anime.ui.theme.ShinseiAnimeTheme
import com.shinsei.anime.ui.theme.SurfaceDark
import com.shinsei.anime.ui.theme.TextMuted
import com.shinsei.anime.ui.theme.TextPrimary

enum class MainTab(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Default.Home),
    BROWSE("Browse", Icons.Default.Explore),
    DOWNLOADS("Downloads", Icons.Default.Download),
    SYNC("Sync", Icons.Default.Sync)
}

class MainActivity : ComponentActivity() {

    private val homeViewModel: HomeViewModel by viewModels()
    private val detailViewModel: DetailViewModel by viewModels()

    private var pendingDetailAnimeId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        pendingDetailAnimeId = intent.getStringExtra("open_detail_anime_id")

        setContent {
            ShinseiAnimeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundBlack
                ) {
                    AppNavigation()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val animeId = intent.getStringExtra("open_detail_anime_id")
        if (!animeId.isNullOrEmpty()) {
            pendingDetailAnimeId = animeId
        }
    }

    @Composable
    private fun AppNavigation() {
        val navController = rememberNavController()
        var showSyncSheet by remember { mutableStateOf(false) }

        // Handle "View All Episodes" navigation from PlayerActivity
        androidx.compose.runtime.LaunchedEffect(Unit) {
            val id = pendingDetailAnimeId
            if (!id.isNullOrEmpty()) {
                pendingDetailAnimeId = null
                navController.navigate("detail/$id")
            }
        }

        NavHost(navController = navController, startDestination = "main") {
            composable("main") {
                MainTabsScaffold(
                    onNavigateToDetail = { animeId ->
                        navController.navigate("detail/$animeId")
                    },
                    onPlayProgress = { progress ->
                        launchPlayerForProgress(progress)
                    },
                    onPlayDownload = { download ->
                        launchPlayerForDownload(download)
                    },
                    onOpenSyncSheet = {
                        showSyncSheet = true
                    }
                )
            }

            composable(
                route = "detail/{animeId}",
                arguments = listOf(navArgument("animeId") { type = NavType.StringType })
            ) { backStackEntry ->
                val animeId = backStackEntry.arguments?.getString("animeId") ?: ""
                DetailScreen(
                    animeId = animeId,
                    viewModel = detailViewModel,
                    onBack = { navController.popBackStack() },
                    onPlayEpisode = { aid, title, poster, ep, epsJson, isDub, malId ->
                        launchPlayer(aid, title, poster, ep, epsJson, isDub, malId)
                    }
                )
            }
        }

        if (showSyncSheet) {
            QrScannerSheet(
                onDismiss = { showSyncSheet = false },
                onSyncSuccess = {
                    homeViewModel.loadHomeFeed()
                }
            )
        }
    }

    @Composable
    private fun MainTabsScaffold(
        onNavigateToDetail: (String) -> Unit,
        onPlayProgress: (WatchProgressEntity) -> Unit,
        onPlayDownload: (DownloadEntity) -> Unit,
        onOpenSyncSheet: () -> Unit
    ) {
        var currentTab by rememberSaveable { mutableStateOf(MainTab.HOME) }

        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = SurfaceDark,
                    tonalElevation = 8.dp
                ) {
                    MainTab.values().forEach { tab ->
                        val isSelected = currentTab == tab
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { currentTab = tab },
                            icon = {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.label
                                )
                            },
                            label = {
                                Text(
                                    text = tab.label,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 11.sp
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = CrunchyOrange,
                                selectedTextColor = CrunchyOrange,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted,
                                indicatorColor = CrunchyOrange.copy(alpha = 0.15f)
                            )
                        )
                    }
                }
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())
            ) {
                when (currentTab) {
                    MainTab.HOME -> {
                        HomeScreen(
                            viewModel = homeViewModel,
                            onNavigateToDetail = onNavigateToDetail,
                            onPlayProgress = onPlayProgress,
                            onOpenSyncSheet = onOpenSyncSheet
                        )
                    }
                    MainTab.BROWSE -> {
                        BrowseScreen(
                            viewModel = homeViewModel,
                            onNavigateToDetail = onNavigateToDetail
                        )
                    }
                    MainTab.DOWNLOADS -> {
                        DownloadsScreen(
                            onPlayOffline = onPlayDownload,
                            onNavigateToBrowse = { currentTab = MainTab.BROWSE }
                        )
                    }
                    MainTab.SYNC -> {
                        SyncScreen(
                            onOpenQrScanner = onOpenSyncSheet
                        )
                    }
                }
            }
        }
    }

    private fun launchPlayer(
        animeId: String,
        animeTitle: String,
        animePoster: String,
        episode: EpisodeItem,
        episodesJson: String,
        isDub: Boolean,
        malId: Long
    ) {
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putExtra("anime_id", animeId)
            putExtra("anime_title", animeTitle)
            putExtra("anime_poster", animePoster)
            putExtra("ep_id", episode.id)
            putExtra("ep_num", episode.num)
            putExtra("ep_name", episode.name)
            putExtra("episodes_json", episodesJson)
            putExtra("is_dub", isDub)
            putExtra("mal_id", malId)
        }
        startActivity(intent)
    }

    private fun launchPlayerForProgress(progress: WatchProgressEntity) {
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putExtra("anime_id", progress.animeId)
            putExtra("anime_title", progress.animeTitle)
            putExtra("anime_poster", progress.animePoster)
            putExtra("ep_id", progress.epId)
            putExtra("ep_num", progress.epNum)
            putExtra("ep_name", progress.epName)
            putExtra("is_dub", false)
        }
        startActivity(intent)
    }

    private fun launchPlayerForDownload(download: DownloadEntity) {
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putExtra("anime_id", download.animeId)
            putExtra("anime_title", download.animeTitle)
            putExtra("anime_poster", download.animePoster)
            putExtra("ep_id", download.epId)
            putExtra("ep_num", download.epNum)
            putExtra("ep_name", download.epName)
            putExtra("is_dub", false)
        }
        startActivity(intent)
    }
}
