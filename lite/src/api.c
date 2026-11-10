#define _POSIX_C_SOURCE 200809L
#include "api.h"
#include "http.h"
#include "cJSON.h"
#include "config.h"
#include "crypto.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <regex.h>
#include <ctype.h>

static long long g_current_anime_id = 0;

static int get_anilab_headers(const char **out_hdrs, int max) {
    const AppConfig *cfg = config_get();
    int n = cfg->anilab_header_count < max ? cfg->anilab_header_count : max;
    for (int i = 0; i < n; i++) {
        out_hdrs[i] = cfg->anilab_headers[i];
    }
    return n;
}

static const char *map_lang_flag(const char *code) {
    if (!code || !*code) return "";
    if (strcmp(code, "jpn") == 0 || strcmp(code, "ja") == 0) return "🇯🇵";
    if (strcmp(code, "eng") == 0 || strcmp(code, "en") == 0) return "🇺🇸";
    if (strcmp(code, "kor") == 0 || strcmp(code, "ko") == 0) return "🇰🇷";
    if (strcmp(code, "spa") == 0 || strcmp(code, "es") == 0) return "🇪🇸";
    if (strcmp(code, "por") == 0 || strcmp(code, "pt") == 0) return "🇧🇷";
    if (strcmp(code, "fra") == 0 || strcmp(code, "fr") == 0) return "🇫🇷";
    if (strcmp(code, "deu") == 0 || strcmp(code, "de") == 0) return "🇩🇪";
    if (strcmp(code, "ita") == 0 || strcmp(code, "it") == 0) return "🇮🇹";
    if (strcmp(code, "ara") == 0 || strcmp(code, "ar") == 0) return "🇸🇦";
    if (strcmp(code, "hin") == 0 || strcmp(code, "hi") == 0) return "🇮🇳";
    if (strcmp(code, "zho") == 0 || strcmp(code, "zh") == 0) return "🇨🇳";
    if (strcmp(code, "tha") == 0 || strcmp(code, "th") == 0) return "🇹🇭";
    if (strcmp(code, "ind") == 0 || strcmp(code, "id") == 0) return "🇮🇩";
    if (strcmp(code, "vie") == 0 || strcmp(code, "vi") == 0) return "🇻🇳";
    if (strcmp(code, "fil") == 0 || strcmp(code, "tl") == 0) return "🇵🇭";
    if (strcmp(code, "rus") == 0 || strcmp(code, "ru") == 0) return "🇷🇺";
    return "";
}

int api_search(const char *query, AnimeItem **out_items, int *out_count) {
    if (!query || !out_items || !out_count) return -1;
    *out_items = NULL;
    *out_count = 0;

    char *enc_query = http_url_encode(query);
    if (!enc_query) return -1;

    char url[512];
    snprintf(url, sizeof(url), "%s/search?query=%s&page=1", config_get()->anilab_base_url, enc_query);
    free(enc_query);

    const char *hdrs[16];
    int hdr_count = get_anilab_headers(hdrs, 16);

    HttpResponse res = http_get(url, hdrs, hdr_count);
    if (res.status_code != 200 || !res.data) {
        http_response_free(&res);
        return -1;
    }

    cJSON *root = cJSON_Parse(res.data);
    http_response_free(&res);
    if (!root) return -1;

    cJSON *posts = cJSON_GetObjectItemCaseSensitive(root, "posts");
    if (!posts || !cJSON_IsArray(posts)) {
        cJSON_Delete(root);
        return -1;
    }

    int total = cJSON_GetArraySize(posts);
    if (total == 0) {
        cJSON_Delete(root);
        return 0;
    }

    AnimeItem *items = calloc(total, sizeof(AnimeItem));
    if (!items) {
        cJSON_Delete(root);
        return -1;
    }

    for (int i = 0; i < total; i++) {
        cJSON *item = cJSON_GetArrayItem(posts, i);
        if (!item) continue;

        cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
        if (id && cJSON_IsNumber(id)) {
            items[i].id = (long long)id->valuedouble;
        }

        cJSON *poster = cJSON_GetObjectItemCaseSensitive(item, "poster");
        if (poster && cJSON_IsString(poster) && poster->valuestring) {
            strncpy(items[i].poster, poster->valuestring, sizeof(items[i].poster) - 1);
        }

        cJSON *name = cJSON_GetObjectItemCaseSensitive(item, "name");
        if (!name) name = cJSON_GetObjectItemCaseSensitive(item, "title");
        if (name && cJSON_IsString(name) && name->valuestring) {
            strncpy(items[i].title, name->valuestring, sizeof(items[i].title) - 1);
        }
    }

    cJSON_Delete(root);

    // Hydrate top search results that lack title via /post?id=
    int hydrate_count = total < 8 ? total : 8;
    for (int i = 0; i < total; i++) {
        if (items[i].title[0] == '\0') {
            if (i < hydrate_count && items[i].id > 0) {
                char post_url[512];
                snprintf(post_url, sizeof(post_url), "%s/post?id=%lld", config_get()->anilab_base_url, items[i].id);
                HttpResponse p_res = http_get(post_url, hdrs, hdr_count);
                if (p_res.status_code == 200 && p_res.data) {
                    cJSON *p_root = cJSON_Parse(p_res.data);
                    if (p_root) {
                        cJSON *p_title = cJSON_GetObjectItemCaseSensitive(p_root, "title");
                        if (!p_title) p_title = cJSON_GetObjectItemCaseSensitive(p_root, "name");
                        if (p_title && cJSON_IsString(p_title) && p_title->valuestring) {
                            strncpy(items[i].title, p_title->valuestring, sizeof(items[i].title) - 1);
                        }
                        cJSON_Delete(p_root);
                    }
                }
                http_response_free(&p_res);
            }
            if (items[i].title[0] == '\0') {
                snprintf(items[i].title, sizeof(items[i].title), "Anime #%lld", items[i].id);
            }
        }
    }

    *out_items = items;
    *out_count = total;
    return 0;
}

int api_get_episodes(long long anime_id, EpisodeItem **out_episodes, int *out_count) {
    if (!out_episodes || !out_count) return -1;
    *out_episodes = NULL;
    *out_count = 0;
    g_current_anime_id = anime_id;

    char url[512];
    snprintf(url, sizeof(url), "%s/episodes", config_get()->kyoto_base_url);

    char body[128];
    snprintf(body, sizeof(body), "id=%lld", anime_id);

    char hdr_buf[16][256];
    const char *hdrs[16];
    int hdr_count = 0;
    if (kyoto_sign_request("POST", "/episodes", body, hdr_buf, hdrs, &hdr_count) != 0) {
        return -1;
    }

    HttpResponse res = http_post(url, body, hdrs, hdr_count);
    if (res.status_code != 200 || !res.data) {
        http_response_free(&res);
        return -1;
    }

    cJSON *ep_root = cJSON_Parse(res.data);
    http_response_free(&res);
    if (!ep_root) return -1;

    cJSON *list = cJSON_GetObjectItemCaseSensitive(ep_root, "list");
    if (!list || !cJSON_IsArray(list)) {
        cJSON_Delete(ep_root);
        return -1;
    }

    int total = cJSON_GetArraySize(list);
    if (total == 0) {
        cJSON_Delete(ep_root);
        return 0;
    }

    EpisodeItem *episodes = calloc(total, sizeof(EpisodeItem));
    if (!episodes) {
        cJSON_Delete(ep_root);
        return -1;
    }

    for (int i = 0; i < total; i++) {
        cJSON *item = cJSON_GetArrayItem(list, i);
        if (!item) continue;

        cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
        if (id) {
            if (cJSON_IsString(id) && id->valuestring) {
                strncpy(episodes[i].id, id->valuestring, sizeof(episodes[i].id) - 1);
            } else if (cJSON_IsNumber(id)) {
                snprintf(episodes[i].id, sizeof(episodes[i].id), "%.0f", id->valuedouble);
            }
        }

        cJSON *number = cJSON_GetObjectItemCaseSensitive(item, "number");
        if (number) {
            if (cJSON_IsString(number) && number->valuestring) {
                strncpy(episodes[i].number, number->valuestring, sizeof(episodes[i].number) - 1);
            } else if (cJSON_IsNumber(number)) {
                snprintf(episodes[i].number, sizeof(episodes[i].number), "%.0f", number->valuedouble);
            }
        }
        if (episodes[i].number[0] == '\0') {
            snprintf(episodes[i].number, sizeof(episodes[i].number), "%d", i + 1);
        }

        cJSON *name = cJSON_GetObjectItemCaseSensitive(item, "name");
        if (name && cJSON_IsString(name) && name->valuestring) {
            strncpy(episodes[i].name, name->valuestring, sizeof(episodes[i].name) - 1);
        } else {
            snprintf(episodes[i].name, sizeof(episodes[i].name), "Episode %s", episodes[i].number);
        }
    }

    cJSON_Delete(ep_root);
    *out_episodes = episodes;
    *out_count = total;
    return 0;
}

int api_get_servers(const char *ep_id, ServerItem **out_servers, int *out_count) {
    if (!ep_id || !out_servers || !out_count) return -1;
    *out_servers = NULL;
    *out_count = 0;

    char url[512];
    snprintf(url, sizeof(url), "%s/servers", config_get()->kyoto_base_url);

    char body[256];
    snprintf(body, sizeof(body), "id=%lld&episode=%s", g_current_anime_id, ep_id);

    char hdr_buf[16][256];
    const char *hdrs[16];
    int hdr_count = 0;
    if (kyoto_sign_request("POST", "/servers", body, hdr_buf, hdrs, &hdr_count) != 0) {
        return -1;
    }

    HttpResponse res = http_post(url, body, hdrs, hdr_count);
    if (res.status_code != 200 || !res.data) {
        http_response_free(&res);
        return -1;
    }

    cJSON *root = cJSON_Parse(res.data);
    http_response_free(&res);
    if (!root) return -1;

    cJSON *list = cJSON_GetObjectItemCaseSensitive(root, "list");
    if (!list || !cJSON_IsArray(list)) {
        cJSON_Delete(root);
        return -1;
    }

    int total = cJSON_GetArraySize(list);
    if (total == 0) {
        cJSON_Delete(root);
        return 0;
    }

    ServerItem *servers = calloc(total, sizeof(ServerItem));
    if (!servers) {
        cJSON_Delete(root);
        return -1;
    }

    for (int i = 0; i < total; i++) {
        cJSON *item = cJSON_GetArrayItem(list, i);
        if (!item) continue;

        cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
        if (id && cJSON_IsString(id) && id->valuestring) {
            strncpy(servers[i].id, id->valuestring, sizeof(servers[i].id) - 1);
        }

        cJSON *name = cJSON_GetObjectItemCaseSensitive(item, "name");
        if (name && cJSON_IsString(name) && name->valuestring) {
            strncpy(servers[i].name, name->valuestring, sizeof(servers[i].name) - 1);
        } else {
            snprintf(servers[i].name, sizeof(servers[i].name), "Server %d", i + 1);
        }

        cJSON *lang = cJSON_GetObjectItemCaseSensitive(item, "lang");
        char raw_lang[32] = {0};
        if (lang && cJSON_IsString(lang) && lang->valuestring) {
            strncpy(raw_lang, lang->valuestring, sizeof(raw_lang) - 1);
        }

        char *slash = strrchr(servers[i].id, '/');
        if (slash && *(slash + 1)) {
            strncpy(servers[i].lang_code, slash + 1, sizeof(servers[i].lang_code) - 1);
            for (size_t c = 0; c < strlen(servers[i].lang_code); c++) {
                servers[i].lang_code[c] = tolower((unsigned char)servers[i].lang_code[c]);
            }
        }

        int is_dub = 0;
        if (strncasecmp(raw_lang, "dub", 3) == 0 ||
            strcasecmp(servers[i].lang_code, "eng") == 0 ||
            strcasecmp(servers[i].lang_code, "en") == 0 ||
            strstr(servers[i].name, "DUB") != NULL) {
            is_dub = 1;
        }

        strncpy(servers[i].lang, is_dub ? "dub" : "sub", sizeof(servers[i].lang) - 1);
        const char *flag = map_lang_flag(servers[i].lang_code);
        strncpy(servers[i].flag, flag, sizeof(servers[i].flag) - 1);
    }

    cJSON_Delete(root);
    *out_servers = servers;
    *out_count = total;
    return 0;
}

int api_resolve_stream(const char *server_id, StreamResult *out_stream) {
    if (!server_id || !out_stream) return -1;
    memset(out_stream, 0, sizeof(StreamResult));

    char url[512];
    snprintf(url, sizeof(url), "%s/stream", config_get()->kyoto_base_url);

    char body[512];
    snprintf(body, sizeof(body), "id=%lld&server=%s", g_current_anime_id, server_id);

    char hdr_buf[16][256];
    const char *hdrs[16];
    int hdr_count = 0;
    if (kyoto_sign_request("POST", "/stream", body, hdr_buf, hdrs, &hdr_count) != 0) {
        return -1;
    }

    HttpResponse res = http_post(url, body, hdrs, hdr_count);
    if (res.status_code != 200 || !res.data) {
        http_response_free(&res);
        return -1;
    }

    cJSON *root = cJSON_Parse(res.data);
    http_response_free(&res);
    if (!root) return -1;

    cJSON *link_item = cJSON_GetObjectItemCaseSensitive(root, "link");
    if (!link_item || !cJSON_IsString(link_item) || !link_item->valuestring) {
        cJSON_Delete(root);
        return -1;
    }

    char link[1024];
    strncpy(link, link_item->valuestring, sizeof(link) - 1);
    cJSON_Delete(root);

    // If direct .m3u8, return immediately
    if (strstr(link, ".m3u8")) {
        snprintf(out_stream->url, sizeof(out_stream->url), "%s", link);
        snprintf(out_stream->embed, sizeof(out_stream->embed), "%s", link);
        return 0;
    }

    // Embed HTML fallback: fetch HTML and regex match .m3u8
    const char *html_headers[] = {
        "Referer: https://play.app/",
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    };

    HttpResponse html_res = http_get(link, html_headers, 3);
    if (html_res.status_code != 200 || !html_res.data) {
        http_response_free(&html_res);
        return -1;
    }

    regex_t regex;
    int reg_err = regcomp(&regex, "https?://[^[:space:]\"'<>\\]+\\.m3u8[^[:space:]\"'<>\\]*", REG_EXTENDED | REG_ICASE);
    if (reg_err != 0) {
        http_response_free(&html_res);
        return -1;
    }

    regmatch_t pmatch[1];
    const char *cursor = html_res.data;
    char first_match[1024] = {0};
    char master_match[1024] = {0};

    while (regexec(&regex, cursor, 1, pmatch, 0) == 0) {
        int len = pmatch[0].rm_eo - pmatch[0].rm_so;
        char match[1024];
        if (len >= (int)sizeof(match)) len = sizeof(match) - 1;
        memcpy(match, cursor + pmatch[0].rm_so, len);
        match[len] = '\0';

        if (!first_match[0]) {
            snprintf(first_match, sizeof(first_match), "%s", match);
        }
        if (strstr(match, "master.m3u8")) {
            snprintf(master_match, sizeof(master_match), "%s", match);
            break;
        }
        cursor += pmatch[0].rm_eo;
    }

    regfree(&regex);
    http_response_free(&html_res);

    if (master_match[0]) {
        snprintf(out_stream->url, sizeof(out_stream->url), "%s", master_match);
    } else if (first_match[0]) {
        snprintf(out_stream->url, sizeof(out_stream->url), "%s", first_match);
    } else {
        return -1;
    }

    snprintf(out_stream->embed, sizeof(out_stream->embed), "%s", link);
    return 0;
}

void api_free_anime_list(AnimeItem *items) {
    if (items) free(items);
}

void api_free_episodes(EpisodeItem *items) {
    if (items) free(items);
}

void api_free_servers(ServerItem *items) {
    if (items) free(items);
}
