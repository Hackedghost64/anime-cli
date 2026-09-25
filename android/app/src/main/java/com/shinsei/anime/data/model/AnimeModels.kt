package com.shinsei.anime.data.model

data class AnimeCard(
    val id: String,
    val title: String,
    val poster: String,
    val score: String = "",
    val type: String = "TV"
)

data class AnimeDetail(
    val id: String,
    val title: String,
    val poster: String,
    val synopsis: String = "",
    val score: String = "",
    val type: String = "TV",
    val genres: List<String> = emptyList(),
    val malId: Long = 0L
)

data class EpisodeItem(
    val id: String,
    val num: String,
    val name: String = "",
    val duration: String = ""
)
