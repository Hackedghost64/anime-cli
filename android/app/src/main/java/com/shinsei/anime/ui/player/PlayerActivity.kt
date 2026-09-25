package com.shinsei.anime.ui.player

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.ShinseiAnimeTheme

class PlayerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShinseiAnimeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundBlack
                ) {
                    Text(text = "Crunchyroll Player")
                }
            }
        }
    }
}
