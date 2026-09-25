package com.shinsei.anime.data.local

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "watch_progress",
    primaryKeys = ["animeId", "epId"],
    indices = [Index(value = ["animeId"]), Index(value = ["updatedAt"])]
)
data class WatchProgressEntity(
    val animeId: String,
    val epId: String,
    val animeTitle: String = "",
    val animePoster: String = "",
    val epNum: String = "",
    val epName: String = "",
    val position: Double = 0.0,
    val duration: Double = 0.0,
    val updatedAt: Long = System.currentTimeMillis() / 1000
)
