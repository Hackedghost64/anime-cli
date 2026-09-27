package com.shinsei.anime.data.model

data class AnimeCard(
    val id: String,
    val title: String,
    val poster: String,
    val score: String = "",
    val type: String = "TV"
)

data class SeasonItem(
    val id: String,
    val title: String,
    val seasonNumber: Int = 0
)

data class AnimeDetail(
    val id: String,
    val title: String,
    val poster: String,
    val synopsis: String = "",
    val score: String = "",
    val type: String = "TV",
    val genres: List<String> = emptyList(),
    val malId: Long = 0L,
    val seasons: List<SeasonItem> = emptyList()
)

data class EpisodeItem(
    val id: String,
    val num: String,
    val name: String = "",
    val duration: String = ""
)

data class AnimeRail(
    val title: String,
    val items: List<AnimeCard>
)
