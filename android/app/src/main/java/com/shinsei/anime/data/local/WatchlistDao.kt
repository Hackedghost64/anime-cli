package com.shinsei.anime.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchlistDao {

    @Query("SELECT * FROM watchlist ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<WatchlistEntity>>

    @Query("SELECT * FROM watchlist WHERE status = :status ORDER BY updatedAt DESC")
    fun observeByStatus(status: String): Flow<List<WatchlistEntity>>

    @Query("SELECT * FROM watchlist WHERE animeId = :animeId")
    suspend fun get(animeId: String): WatchlistEntity?

    @Query("SELECT EXISTS(SELECT 1 FROM watchlist WHERE animeId = :animeId)")
    fun observeIsInWatchlist(animeId: String): Flow<Boolean>

    @Upsert
    suspend fun upsert(entity: WatchlistEntity)

    @Upsert
    suspend fun upsertAll(entities: List<WatchlistEntity>)

    @Query("DELETE FROM watchlist WHERE animeId = :animeId")
    suspend fun delete(animeId: String)

    @Query("SELECT * FROM watchlist ORDER BY updatedAt DESC")
    suspend fun getAll(): List<WatchlistEntity>
}
