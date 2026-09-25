package com.shinsei.anime.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface DownloadDao {

    @Query("SELECT * FROM downloads ORDER BY createdAt DESC")
    fun observeAllDownloads(): Flow<List<DownloadEntity>>

    @Query("SELECT * FROM downloads WHERE animeId = :animeId ORDER BY CAST(epNum AS INTEGER) ASC")
    fun observeDownloadsForAnime(animeId: String): Flow<List<DownloadEntity>>

    @Query("SELECT * FROM downloads WHERE id = :id LIMIT 1")
    suspend fun getDownload(id: String): DownloadEntity?

    @Query("SELECT * FROM downloads WHERE animeId = :animeId AND epId = :epId LIMIT 1")
    suspend fun getDownload(animeId: String, epId: String): DownloadEntity?

    @Query("SELECT * FROM downloads WHERE status = 'DOWNLOADING' OR status = 'QUEUED' LIMIT 1")
    suspend fun getNextActiveDownload(): DownloadEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: DownloadEntity)

    @Query("UPDATE downloads SET progress = :progress, downloadedChunks = :downloadedChunks, fileSize = :fileSize WHERE id = :id")
    suspend fun updateProgress(id: String, progress: Int, downloadedChunks: Int, fileSize: Long)

    @Query("UPDATE downloads SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: String, status: String)

    @Query("DELETE FROM downloads WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM downloads WHERE animeId = :animeId AND epId = :epId")
    suspend fun delete(animeId: String, epId: String)
}
