#ifndef ANIME_LITE_API_H
#define ANIME_LITE_API_H

#include <stddef.h>

typedef struct {
    long long id;
    char title[256];
    char poster[512];
} AnimeItem;

typedef struct {
    char id[64];
    char number[32];
    char name[256];
} EpisodeItem;

typedef struct {
    char id[128];
    char name[128];
    char lang[32];
    char lang_code[16];
    char flag[16];
} ServerItem;

typedef struct {
    char url[1024];
    char embed[1024];
} StreamResult;

int api_search(const char *query, AnimeItem **out_items, int *out_count);
int api_get_episodes(long long anime_id, EpisodeItem **out_episodes, int *out_count);
int api_get_servers(const char *ep_id, ServerItem **out_servers, int *out_count);
int api_resolve_stream(const char *server_id, StreamResult *out_stream);

void api_free_anime_list(AnimeItem *items);
void api_free_episodes(EpisodeItem *items);
void api_free_servers(ServerItem *items);

#endif // ANIME_LITE_API_H
