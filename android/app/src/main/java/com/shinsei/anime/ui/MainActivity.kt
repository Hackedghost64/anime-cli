package com.shinsei.anime.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.shinsei.anime.data.local.WatchProgressEntity
import com.shinsei.anime.data.model.EpisodeItem
import com.shinsei.anime.ui.detail.DetailScreen
import com.shinsei.anime.ui.detail.DetailViewModel
import com.shinsei.anime.ui.home.HomeScreen
import com.shinsei.anime.ui.home.HomeViewModel
import com.shinsei.anime.ui.player.PlayerActivity
import com.shinsei.anime.ui.sync.QrScannerSheet
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.ShinseiAnimeTheme

class MainActivity : ComponentActivity() {

    private val homeViewModel: HomeViewModel by viewModels()
    private val detailViewModel: DetailViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

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

    @Composable
    private fun AppNavigation() {
        val navController = rememberNavController()
        var showSyncSheet by remember { mutableStateOf(false) }

        NavHost(navController = navController, startDestination = "home") {
            composable("home") {
                HomeScreen(
                    viewModel = homeViewModel,
                    onNavigateToDetail = { animeId ->
                        navController.navigate("detail/$animeId")
                    },
                    onPlayProgress = { progress ->
                        launchPlayerForProgress(progress)
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
}
