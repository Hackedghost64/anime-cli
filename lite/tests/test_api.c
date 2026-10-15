#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../src/http.h"
#include "../src/api.h"

int main(void) {
    http_init();

    // 1. Search anime
    AnimeItem *animes = NULL;
    int anime_count = 0;
    int s_res = api_search("naruto", &animes, &anime_count);
    assert(s_res == 0);
    assert(anime_count > 0);
    assert(strlen(animes[0].title) > 0);
    printf("Found Anime: %s (ID: %lld)\n", animes[0].title, animes[0].id);

    long long anime_id = animes[0].id;

    // 2. Fetch episodes
    EpisodeItem *episodes = NULL;
    int ep_count = 0;
    int e_res = api_get_episodes(anime_id, &episodes, &ep_count);
    assert(e_res == 0);
    assert(ep_count > 0);
    printf("First Episode: %s (%s)\n", episodes[0].name, episodes[0].id);

    // 3. Fetch servers
    ServerItem *servers = NULL;
    int server_count = 0;
    int srv_res = api_get_servers(episodes[0].id, &servers, &server_count);
    assert(srv_res == 0);
    assert(server_count > 0);
    printf("First Server: %s [%s]\n", servers[0].name, servers[0].lang);

    // 4. Resolve stream
    StreamResult stream;
    int st_res = api_resolve_stream(servers[0].id, &stream);
    assert(st_res == 0);
    assert(strstr(stream.url, ".m3u8") != NULL);
    printf("Stream URL: %s\n", stream.url);

    api_free_anime_list(animes);
    api_free_episodes(episodes);
    api_free_servers(servers);
    http_cleanup();

    printf("test_api: ALL TESTS PASSED\n");
    return 0;
}
