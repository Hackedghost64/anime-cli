package com.shinsei.anime.ui.watchlist

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.WatchlistEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class WatchlistViewModel(application: Application) : AndroidViewModel(application) {

    private val dao = (application as ShinseiApp).database.watchlistDao()

    private val _selectedFilter = MutableStateFlow<String?>(null)
    val selectedFilter: StateFlow<String?> = _selectedFilter.asStateFlow()

    val watchlist: StateFlow<List<WatchlistEntity>> = _selectedFilter
        .flatMapLatest { filter ->
            if (filter == null) dao.observeAll()
            else dao.observeByStatus(filter)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setFilter(status: String?) {
        _selectedFilter.value = status
    }

    fun removeFromWatchlist(animeId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            dao.delete(animeId)
        }
    }

    fun updateStatus(animeId: String, newStatus: String) {
        viewModelScope.launch(Dispatchers.IO) {
            val existing = dao.get(animeId) ?: return@launch
            dao.upsert(existing.copy(
                status = newStatus,
                updatedAt = System.currentTimeMillis() / 1000
            ))
        }
    }
}
