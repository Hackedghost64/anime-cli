package com.shinsei.anime.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchProgressDao {

    @Query("SELECT * FROM watch_progress ORDER BY updatedAt DESC")
    fun observeAllProgress(): Flow<List<WatchProgressEntity>>

    @Query("SELECT * FROM watch_progress ORDER BY updatedAt DESC")
    suspend fun getAllProgress(): List<WatchProgressEntity>

    @Query("SELECT * FROM watch_progress WHERE animeId = :animeId ORDER BY updatedAt DESC")
    suspend fun getAnimeProgress(animeId: String): List<WatchProgressEntity>

    @Query("SELECT * FROM watch_progress WHERE animeId = :animeId AND epId = :epId LIMIT 1")
    suspend fun getProgress(animeId: String, epId: String): WatchProgressEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: WatchProgressEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<WatchProgressEntity>)

    @Query("DELETE FROM watch_progress WHERE animeId = :animeId AND epId = :epId")
    suspend fun delete(animeId: String, epId: String)
}
