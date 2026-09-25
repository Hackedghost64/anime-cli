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

data class HomeUiState(
    val isLoading: Boolean = false,
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

    val continueWatching: StateFlow<List<WatchProgressEntity>> = dao.observeAllProgress()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeFeed()
    }

    fun loadHomeFeed() {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val homeJsonStr = scriptRunner.getHome()
                val cards = parseAnimeCards(homeJsonStr)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    trending = cards
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load catalog"
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
                if (id.isNotEmpty() && title.isNotEmpty()) {
                    list.add(AnimeCard(id = id, title = title, poster = poster, score = score, type = type))
                }
            }
        } catch (e: Exception) {
            // ignore
        }
        return list
    }
}
