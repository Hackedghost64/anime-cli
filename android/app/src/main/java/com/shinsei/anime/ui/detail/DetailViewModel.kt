package com.shinsei.anime.ui.detail

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.WatchProgressEntity
import com.shinsei.anime.data.model.AnimeDetail
import com.shinsei.anime.data.model.EpisodeItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class DetailUiState(
    val isLoading: Boolean = true,
    val detail: AnimeDetail? = null,
    val episodes: List<EpisodeItem> = emptyList(),
    val rawEpisodesJson: String = "[]",
    val progressMap: Map<String, WatchProgressEntity> = emptyMap(),
    val resumeEpisode: EpisodeItem? = null,
    val error: String? = null
)

class DetailViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as ShinseiApp
    private val scriptRunner = app.scriptRunner
    private val dao = app.database.watchProgressDao()

    private val _uiState = MutableStateFlow(DetailUiState())
    val uiState: StateFlow<DetailUiState> = _uiState.asStateFlow()

    private val detailCache = app.getSharedPreferences("anime_detail_cache", android.content.Context.MODE_PRIVATE)

    fun loadAnime(animeId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            // Instant load from memory/disk cache if available
            val cachedDetailJson = detailCache.getString("detail_$animeId", null)
            val cachedEpJson = detailCache.getString("episodes_$animeId", null)
            if (!cachedDetailJson.isNullOrEmpty() && !cachedEpJson.isNullOrEmpty()) {
                try {
                    val cachedDetail = parseDetail(cachedDetailJson, animeId)
                    val cachedEpisodes = parseEpisodes(cachedEpJson)
                    val progressList = dao.getAnimeProgress(animeId)
                    val progressMap = progressList.associateBy { it.epId }
                    var resumeEp = computeResumeEpisode(progressList, cachedEpisodes)

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        detail = cachedDetail,
                        episodes = cachedEpisodes,
                        rawEpisodesJson = cachedEpJson,
                        progressMap = progressMap,
                        resumeEpisode = resumeEp
                    )
                } catch (_: Exception) {}
            } else {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            }

            try {
                // Fetch details, episodes and watch progress concurrently in parallel!
                coroutineScope {
                    val detailDeferred = async { scriptRunner.getDetails(animeId) }
                    val episodesDeferred = async { scriptRunner.getEpisodes(animeId) }
                    val progressDeferred = async { dao.getAnimeProgress(animeId) }

                    val detailJson = detailDeferred.await()
                    val episodesJson = episodesDeferred.await()
                    val progressList = progressDeferred.await()

                    if (detailJson.isNotEmpty()) detailCache.edit().putString("detail_$animeId", detailJson).apply()
                    if (episodesJson.isNotEmpty()) detailCache.edit().putString("episodes_$animeId", episodesJson).apply()

                    val detail = parseDetail(detailJson, animeId)
                    val episodes = parseEpisodes(episodesJson)
                    val progressMap = progressList.associateBy { it.epId }
                    val resumeEp = computeResumeEpisode(progressList, episodes)

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        detail = detail,
                        episodes = episodes,
                        rawEpisodesJson = episodesJson,
                        progressMap = progressMap,
                        resumeEpisode = resumeEp
                    )
                }
            } catch (e: Exception) {
                if (_uiState.value.detail == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load anime details"
                    )
                }
            }
        }
    }

    private fun computeResumeEpisode(progressList: List<WatchProgressEntity>, episodes: List<EpisodeItem>): EpisodeItem? {
        if (progressList.isEmpty() || episodes.isEmpty()) return episodes.firstOrNull()
        val latest = progressList.maxByOrNull { it.updatedAt } ?: return episodes.firstOrNull()
        val isFinished = latest.duration > 0 && (latest.position / latest.duration) >= 0.88
        val curIdx = episodes.indexOfFirst { it.id == latest.epId || it.num == latest.epNum }
        return when {
            isFinished && curIdx in 0 until episodes.size - 1 -> episodes[curIdx + 1]
            curIdx >= 0 -> episodes[curIdx]
            else -> episodes.firstOrNull()
        }
    }

    private fun parseDetail(jsonStr: String, fallbackId: String): AnimeDetail {
        return try {
            val obj = JSONObject(jsonStr)
            val genresArr = obj.optJSONArray("genres")
            val genres = mutableListOf<String>()
            if (genresArr != null) {
                for (i in 0 until genresArr.length()) {
                    genres.add(genresArr.getString(i))
                }
            }
            AnimeDetail(
                id = obj.optString("id", fallbackId),
                title = obj.optString("title", "Anime $fallbackId"),
                poster = obj.optString("poster", ""),
                synopsis = obj.optString("synopsis", ""),
                score = obj.optString("score", ""),
                type = obj.optString("type", "TV"),
                genres = genres,
                malId = obj.optLong("mal_id", 0L)
            )
        } catch (e: Exception) {
            AnimeDetail(id = fallbackId, title = "Anime $fallbackId", poster = "")
        }
    }

    private fun parseEpisodes(jsonStr: String): List<EpisodeItem> {
        val list = mutableListOf<EpisodeItem>()
        try {
            val arr = JSONArray(jsonStr)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    EpisodeItem(
                        id = obj.optString("id", ""),
                        num = obj.optString("num", "${i + 1}"),
                        name = obj.optString("name", "Episode ${i + 1}"),
                        duration = obj.optString("duration", "")
                    )
                )
            }
        } catch (e: Exception) {
            // ignore
        }
        return list
    }
}
