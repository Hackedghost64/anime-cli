package com.shinsei.anime.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "watchlist",
    indices = [Index(value = ["status"]), Index(value = ["updatedAt"])]
)
data class WatchlistEntity(
    @PrimaryKey val animeId: String,
    val title: String,
    val poster: String,
    val animeType: String = "",
    val status: String = STATUS_PLAN_TO_WATCH,
    val addedAt: Long = System.currentTimeMillis() / 1000,
    val updatedAt: Long = System.currentTimeMillis() / 1000
) {
    companion object {
        const val STATUS_WATCHING = "WATCHING"
        const val STATUS_PLAN_TO_WATCH = "PLAN_TO_WATCH"
        const val STATUS_COMPLETED = "COMPLETED"
        const val STATUS_ON_HOLD = "ON_HOLD"
        const val STATUS_DROPPED = "DROPPED"
    }
}
