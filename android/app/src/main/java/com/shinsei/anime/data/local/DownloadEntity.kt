package com.shinsei.anime.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "downloads")
data class DownloadEntity(
    @PrimaryKey
    val id: String, // "${animeId}_${epId}"
    val animeId: String,
    val animeTitle: String,
    val animePoster: String,
    val epId: String,
    val epNum: String,
    val epName: String,
    val localPath: String,
    val fileSize: Long = 0L,
    val status: String = STATUS_QUEUED, // QUEUED, DOWNLOADING, COMPLETED, FAILED, CANCELLED
    val progress: Int = 0, // 0 to 100
    val totalChunks: Int = 0,
    val downloadedChunks: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val STATUS_QUEUED = "QUEUED"
        const val STATUS_DOWNLOADING = "DOWNLOADING"
        const val STATUS_COMPLETED = "COMPLETED"
        const val STATUS_FAILED = "FAILED"
        const val STATUS_CANCELLED = "CANCELLED"
    }
}
