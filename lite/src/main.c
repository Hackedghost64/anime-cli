#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <ctype.h>

#include "http.h"
#include "api.h"
#include "ui.h"
#include "player.h"

#define VERSION "1.0.0"

static void print_help(void) {
    ui_banner();
    printf("Usage: anime-lite [OPTIONS] [QUERY]\n\n");
    printf("Arguments:\n");
    printf("  [QUERY]                  Anime search query\n\n");
    printf("Options:\n");
    printf("  -e, --ep <num>           Episode number to stream directly\n");
    printf("  -d, --dub                Prefer English Dub server\n");
    printf("  -s, --sub                Prefer Japanese Sub server\n");
    printf("  -p, --player <name>      Player binary to use (default: mpv)\n");
    printf("  -h, --help               Show this help message\n");
    printf("  -v, --version            Show version information\n\n");
    printf("Examples:\n");
    printf("  anime-lite naruto\n");
    printf("  anime-lite \"attack on titan\" -e 1 -d\n");
    printf("  anime-lite one piece --sub\n");
}

static void trim_whitespace(char *str) {
    if (!str) return;
    char *end;

    // Trim leading space
    char *start = str;
    while (isspace((unsigned char)*start)) start++;

    if (start != str) {
        memmove(str, start, strlen(start) + 1);
    }

    // Trim trailing space
    end = str + strlen(str) - 1;
    while (end >= str && isspace((unsigned char)*end)) {
        *end = '\0';
        end--;
    }
}

int main(int argc, char **argv) {
    char query[512] = {0};
    size_t query_len = 0;
    int target_ep = -1;
    int prefer_dub = 0;
    int prefer_sub = 0;
    const char *player_bin = "mpv";

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0) {
            print_help();
            return 0;
        } else if (strcmp(argv[i], "-v") == 0 || strcmp(argv[i], "--version") == 0) {
            printf("anime-lite %s (C Edition)\n", VERSION);
            return 0;
        } else if (strcmp(argv[i], "-d") == 0 || strcmp(argv[i], "--dub") == 0) {
            prefer_dub = 1;
        } else if (strcmp(argv[i], "-s") == 0 || strcmp(argv[i], "--sub") == 0) {
            prefer_sub = 1;
        } else if (strcmp(argv[i], "-e") == 0 || strcmp(argv[i], "--ep") == 0) {
            if (i + 1 < argc) {
                target_ep = atoi(argv[++i]);
            }
        } else if (strncmp(argv[i], "--ep=", 5) == 0) {
            target_ep = atoi(argv[i] + 5);
        } else if (strcmp(argv[i], "-p") == 0 || strcmp(argv[i], "--player") == 0) {
            if (i + 1 < argc) {
                player_bin = argv[++i];
            }
        } else if (strncmp(argv[i], "--player=", 9) == 0) {
            player_bin = argv[i] + 9;
        } else if (argv[i][0] == '-') {
            fprintf(stderr, "%sUnknown option: %s%s\n", C_RED, argv[i], C_RESET);
            print_help();
            return 1;
        } else {
            if (query_len > 0 && query_len + 1 < sizeof(query)) {
                query[query_len++] = ' ';
                query[query_len] = '\0';
            }
            size_t arglen = strlen(argv[i]);
            if (query_len + arglen < sizeof(query)) {
                memcpy(query + query_len, argv[i], arglen);
                query_len += arglen;
                query[query_len] = '\0';
            }
        }
    }

    trim_whitespace(query);

    // 1. If no search query from argv, prompt interactively
    if (strlen(query) == 0) {
        ui_banner();
        printf("%s%sSearch Anime: %s", C_BOLD, C_CYAN, C_RESET);
        fflush(stdout);

        if (!fgets(query, sizeof(query), stdin)) {
            return 0;
        }
        trim_whitespace(query);
        if (strlen(query) == 0) {
            printf("%sNo search query provided. Exiting.%s\n", C_DIM, C_RESET);
            return 0;
        }
    }

    http_init();

    // 2. Search anime
    printf("%sSearching for '%s%s%s'...%s\n", C_DIM, C_BOLD, query, C_RESET C_DIM, C_RESET);
    AnimeItem *animes = NULL;
    int anime_count = 0;
    int s_res = api_search(query, &animes, &anime_count);
    if (s_res != 0 || anime_count == 0) {
        fprintf(stderr, "%s%sNo anime found for '%s'.%s\n", C_BOLD, C_RED, query, C_RESET);
        http_cleanup();
        return 1;
    }

    // 3. Anime selector
    const char **anime_opts = malloc(anime_count * sizeof(char *));
    if (!anime_opts) {
        api_free_anime_list(animes);
        http_cleanup();
        return 1;
    }
    for (int i = 0; i < anime_count; i++) {
        anime_opts[i] = animes[i].title;
    }

    int anime_idx = ui_select("Select Anime: ", anime_opts, anime_count);
    free(anime_opts);

    if (anime_idx < 0) {
        printf("%sCancelled.%s\n", C_DIM, C_RESET);
        api_free_anime_list(animes);
        http_cleanup();
        return 0;
    }

    AnimeItem selected_anime = animes[anime_idx];
    printf("%s%sAnime: %s%s%s\n", C_BOLD, C_GREEN, C_RESET, selected_anime.title, C_RESET);

    // 4. Fetch episodes
    printf("%sFetching episode list...%s\n", C_DIM, C_RESET);
    EpisodeItem *episodes = NULL;
    int ep_count = 0;
    int e_res = api_get_episodes(selected_anime.id, &episodes, &ep_count);
    if (e_res != 0 || ep_count == 0) {
        fprintf(stderr, "%s%sError: Failed to fetch episodes.%s\n", C_BOLD, C_RED, C_RESET);
        api_free_anime_list(animes);
        http_cleanup();
        return 1;
    }

    // 5. Episode selector
    int ep_idx = -1;
    if (target_ep > 0) {
        for (int i = 0; i < ep_count; i++) {
            if (atoi(episodes[i].number) == target_ep) {
                ep_idx = i;
                break;
            }
        }
        if (ep_idx < 0 && target_ep >= 1 && target_ep <= ep_count) {
            ep_idx = target_ep - 1;
        }
    }

    if (ep_idx < 0) {
        char **ep_opts = malloc(ep_count * sizeof(char *));
        if (!ep_opts) {
            api_free_episodes(episodes);
            api_free_anime_list(animes);
            http_cleanup();
            return 1;
        }
        for (int i = 0; i < ep_count; i++) {
            ep_opts[i] = malloc(300);
            if (strlen(episodes[i].name) > 0) {
                snprintf(ep_opts[i], 300, "%s", episodes[i].name);
            } else {
                snprintf(ep_opts[i], 300, "Episode %s", episodes[i].number);
            }
        }

        ep_idx = ui_select("Select Episode: ", (const char **)ep_opts, ep_count);

        for (int i = 0; i < ep_count; i++) {
            free(ep_opts[i]);
        }
        free(ep_opts);

        if (ep_idx < 0) {
            printf("%sCancelled.%s\n", C_DIM, C_RESET);
            api_free_episodes(episodes);
            api_free_anime_list(animes);
            http_cleanup();
            return 0;
        }
    }

    EpisodeItem selected_ep = episodes[ep_idx];
    printf("%s%sEpisode: %s%s%s\n", C_BOLD, C_GREEN, C_RESET, selected_ep.name, C_RESET);

    // 6. Fetch servers
    printf("%sFetching servers...%s\n", C_DIM, C_RESET);
    ServerItem *servers = NULL;
    int server_count = 0;
    int srv_res = api_get_servers(selected_ep.id, &servers, &server_count);
    if (srv_res != 0 || server_count == 0) {
        fprintf(stderr, "%s%sError: Failed to fetch servers.%s\n", C_BOLD, C_RED, C_RESET);
        api_free_episodes(episodes);
        api_free_anime_list(animes);
        http_cleanup();
        return 1;
    }

    // 7. Audio / Server selector
    int srv_idx = -1;
    if (prefer_dub) {
        for (int i = 0; i < server_count; i++) {
            if (strcasecmp(servers[i].lang, "dub") == 0 ||
                strcasecmp(servers[i].lang_code, "dub") == 0 ||
                strstr(servers[i].name, "DUB") != NULL) {
                srv_idx = i;
                break;
            }
        }
    } else if (prefer_sub) {
        for (int i = 0; i < server_count; i++) {
            if (strcasecmp(servers[i].lang, "sub") == 0 ||
                strcasecmp(servers[i].lang_code, "sub") == 0 ||
                strstr(servers[i].name, "SUB") != NULL) {
                srv_idx = i;
                break;
            }
        }
    }

    if (srv_idx < 0) {
        char **srv_opts = malloc(server_count * sizeof(char *));
        if (!srv_opts) {
            api_free_servers(servers);
            api_free_episodes(episodes);
            api_free_anime_list(animes);
            http_cleanup();
            return 1;
        }
        for (int i = 0; i < server_count; i++) {
            srv_opts[i] = malloc(256);
            snprintf(srv_opts[i], 256, "%s [%s]", servers[i].name, servers[i].lang);
        }

        srv_idx = ui_select("Select Audio/Server: ", (const char **)srv_opts, server_count);

        for (int i = 0; i < server_count; i++) {
            free(srv_opts[i]);
        }
        free(srv_opts);

        if (srv_idx < 0) {
            printf("%sCancelled.%s\n", C_DIM, C_RESET);
            api_free_servers(servers);
            api_free_episodes(episodes);
            api_free_anime_list(animes);
            http_cleanup();
            return 0;
        }
    }

    ServerItem selected_srv = servers[srv_idx];
    printf("%s%sServer: %s [%s]%s%s\n", C_BOLD, C_GREEN, selected_srv.name, selected_srv.lang, C_RESET, C_RESET);

    // 8. Resolve stream
    printf("%sResolving Kyoto 1080p stream...%s\n", C_DIM, C_RESET);
    StreamResult stream;
    memset(&stream, 0, sizeof(StreamResult));
    int st_res = api_resolve_stream(selected_srv.id, &stream);
    if (st_res != 0 || stream.url[0] == '\0') {
        fprintf(stderr, "%s%sError: Failed to resolve stream.%s\n", C_BOLD, C_RED, C_RESET);
        api_free_servers(servers);
        api_free_episodes(episodes);
        api_free_anime_list(animes);
        http_cleanup();
        return 1;
    }

    // 9. Launch player
    char media_title[600];
    snprintf(media_title, sizeof(media_title), "%s - %s", selected_anime.title, selected_ep.name);

    printf("%s%sPlaying via %s...%s\n\n", C_BOLD, C_GOLD, player_bin, C_RESET);
    player_play(player_bin, stream.url, media_title, 0);

    // Cleanup
    api_free_servers(servers);
    api_free_episodes(episodes);
    api_free_anime_list(animes);
    http_cleanup();

    return 0;
}
