package com.shinsei.anime.ui.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.WatchProgressEntity
import com.shinsei.anime.data.model.AnimeCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

import com.shinsei.anime.data.model.AnimeRail

data class HomeUiState(
    val isLoading: Boolean = false,
    val spotlight: AnimeCard? = null,
    val spotlightCards: List<AnimeCard> = emptyList(),
    val rails: List<AnimeRail> = emptyList(),
    val trending: List<AnimeCard> = emptyList(),
    val searchResults: List<AnimeCard> = emptyList(),
    val isSearching: Boolean = false,
    val searchQuery: String = "",
    val error: String? = null
)

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as ShinseiApp
    private val scriptRunner = app.scriptRunner
    private val dao = app.database.watchProgressDao()

    val continueWatching: StateFlow<List<WatchProgressEntity>> = dao.observeLatestPerSeries()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val cachePrefs = app.getSharedPreferences("home_feed_cache", android.content.Context.MODE_PRIVATE)

    init {
        // Offload disk cache read and JSON parsing to IO to avoid blocking main thread at startup
        viewModelScope.launch(Dispatchers.IO) {
            val cachedJson = cachePrefs.getString("cached_home_json", null)
            if (!cachedJson.isNullOrEmpty()) {
                try {
                    val parsed = parseHomeFeed(cachedJson)
                    _uiState.value = _uiState.value.copy(
                        spotlight = parsed.spotlight,
                        spotlightCards = parsed.spotlightCards,
                        rails = parsed.rails,
                        trending = parsed.trending
                    )
                } catch (_: Exception) {}
            }
            loadHomeFeed()
        }
    }

    fun loadHomeFeed() {
        viewModelScope.launch(Dispatchers.IO) {
            val hasExistingData = _uiState.value.rails.isNotEmpty() || _uiState.value.spotlight != null
            if (!hasExistingData) {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            }
            try {
                val homeJsonStr = scriptRunner.getHome()
                if (homeJsonStr.isNotEmpty() && homeJsonStr.contains("spotlight")) {
                    cachePrefs.edit().putString("cached_home_json", homeJsonStr).apply()
                }
                val parsed = parseHomeFeed(homeJsonStr)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    spotlight = parsed.spotlight,
                    spotlightCards = parsed.spotlightCards,
                    rails = parsed.rails,
                    trending = parsed.trending
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = if (!hasExistingData) (e.message ?: "Failed to load catalog") else null
                )
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        if (query.trim().isEmpty()) {
            _uiState.value = _uiState.value.copy(isSearching = false, searchResults = emptyList())
        }
    }

    fun executeSearch() {
        val q = _uiState.value.searchQuery.trim()
        if (q.isEmpty()) return

        viewModelScope.launch(Dispatchers.IO) {
            _uiState.value = _uiState.value.copy(isSearching = true, isLoading = true)
            try {
                val searchJsonStr = scriptRunner.search(q)
                val results = parseAnimeCards(searchJsonStr)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    searchResults = results
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Search failed"
                )
            }
        }
    }

    fun clearSearch() {
        _uiState.value = _uiState.value.copy(
            searchQuery = "",
            isSearching = false,
            searchResults = emptyList()
        )
    }

    fun deleteSeriesProgress(animeId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            dao.deleteByAnime(animeId)
        }
    }


    private data class HomeFeedResult(
        val spotlight: AnimeCard?,
        val rails: List<AnimeRail>,
        val trending: List<AnimeCard>,
        val spotlightCards: List<AnimeCard>
    )

    private fun parseHomeFeed(jsonStr: String): HomeFeedResult {
        if (jsonStr.isBlank()) return HomeFeedResult(null, emptyList(), emptyList(), emptyList())
        try {
            val root = JSONObject(jsonStr)
            var spotlightCard: AnimeCard? = null
            val allSpotlightCards = mutableListOf<AnimeCard>()
            val spotlightArr = root.optJSONArray("spotlight")
            if (spotlightArr != null && spotlightArr.length() > 0) {
                for (si in 0 until minOf(spotlightArr.length(), 15)) {
                    val obj = spotlightArr.getJSONObject(si)
                    val id = obj.optString("id", "")
                    if (id.isNotEmpty()) {
                        val card = AnimeCard(
                            id = id,
                            title = obj.optString("title", "Featured Anime"),
                            poster = obj.optString("poster", obj.optString("backdrop", "")),
                            score = obj.optString("score", ""),
                            type = obj.optString("type", "TV")
                        )
                        allSpotlightCards.add(card)
                        if (si == 0) spotlightCard = card
                    }
                }
            }

            val railsList = mutableListOf<AnimeRail>()
            val railsArr = root.optJSONArray("rails")
            if (railsArr != null) {
                for (r in 0 until railsArr.length()) {
                    val rObj = railsArr.getJSONObject(r)
                    val rTitle = rObj.optString("title", "Curated")
                    val itemsArr = rObj.optJSONArray("items") ?: JSONArray()
                    val railCards = mutableListOf<AnimeCard>()
                    for (i in 0 until itemsArr.length()) {
                        val itemObj = itemsArr.getJSONObject(i)
                        val id = itemObj.optString("id", "")
                        val title = itemObj.optString("title", "")
                        val poster = itemObj.optString("poster", "")
                        if (id.isNotEmpty() && (poster.isNotEmpty() || title.isNotEmpty())) {
                            railCards.add(AnimeCard(
                                id = id,
                                title = if (title.isNotEmpty()) title else "Anime",
                                poster = poster,
                                score = itemObj.optString("score", ""),
                                type = itemObj.optString("type", "TV")
                            ))
                        }
                    }
                    if (railCards.isNotEmpty()) {
                        railsList.add(AnimeRail(title = rTitle, items = railCards))
                    }
                }
            }

            val flatCards = mutableListOf<AnimeCard>()
            val itemsArr = root.optJSONArray("items")
            if (itemsArr != null) {
                for (i in 0 until itemsArr.length()) {
                    val obj = itemsArr.getJSONObject(i)
                    val id = obj.optString("id", "")
                    val title = obj.optString("title", "")
                    val poster = obj.optString("poster", "")
                    if (id.isNotEmpty() && (poster.isNotEmpty() || title.isNotEmpty())) {
                        flatCards.add(AnimeCard(
                            id = id,
                            title = if (title.isNotEmpty()) title else "Anime",
                            poster = poster,
                            score = obj.optString("score", ""),
                            type = obj.optString("type", "TV")
                        ))
                    }
                }
            } else if (railsList.isNotEmpty()) {
                val seen = mutableSetOf<String>()
                for (rail in railsList) {
                    for (card in rail.items) {
                        if (seen.add(card.id)) flatCards.add(card)
                    }
                }
            }

            // Build carousel: use real spotlight items if >= 2, else synthesise from rails
            val carouselCards = if (allSpotlightCards.size >= 2) {
                allSpotlightCards
            } else {
                val synthList = mutableListOf<AnimeCard>()
                if (spotlightCard != null) synthList.add(spotlightCard)
                for (rail in railsList.take(3)) {
                    rail.items.firstOrNull()?.let { c ->
                        if (synthList.none { it.id == c.id }) synthList.add(c)
                    }
                }
                synthList
            }

            return HomeFeedResult(spotlightCard, railsList, flatCards, carouselCards)
        } catch (e: Exception) {
            val fallbackCards = parseAnimeCards(jsonStr)
            return HomeFeedResult(fallbackCards.firstOrNull(), emptyList(), fallbackCards, fallbackCards.take(4))
        }
    }


    private fun parseAnimeCards(jsonStr: String): List<AnimeCard> {
        val list = mutableListOf<AnimeCard>()
        if (jsonStr.isBlank()) return list
        try {
            val trimmed = jsonStr.trim()
            val arr: JSONArray = when {
                trimmed.startsWith("[") -> JSONArray(trimmed)
                trimmed.startsWith("{") -> {
                    val root = JSONObject(trimmed)
                    when {
                        root.has("items") -> root.optJSONArray("items")
                        root.has("results") -> root.optJSONArray("results")
                        root.has("spotlight") -> root.optJSONArray("spotlight")
                        root.has("rails") -> {
                            val rails = root.optJSONArray("rails")
                            if (rails != null && rails.length() > 0) {
                                rails.getJSONObject(0).optJSONArray("items")
                            } else null
                        }
                        else -> null
                    } ?: JSONArray()
                }
                else -> JSONArray()
            }

            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val id = obj.optString("id", "")
                val title = obj.optString("title", "")
                val poster = obj.optString("poster", "")
                val score = obj.optString("score", "")
                val type = obj.optString("type", "TV")
                if (id.isNotEmpty() && (title.isNotEmpty() || poster.isNotEmpty())) {
                    list.add(AnimeCard(
                        id = id,
                        title = if (title.isNotEmpty()) title else "Anime",
                        poster = poster,
                        score = score,
                        type = type
                    ))
                }
            }
        } catch (e: Exception) {
            // ignore
        }
        return list
    }
}
