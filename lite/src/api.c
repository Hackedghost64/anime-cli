#define _POSIX_C_SOURCE 200809L
#include "api.h"
#include "http.h"
#include "cJSON.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <regex.h>
#include <ctype.h>

static char g_servers_template[512] = "https://play.anidb.app/api/episode/%id%/servers";
static char g_iframe_template[512] = "https://play.anidb.app/api/episode/%id%/iframe";

static const char *KYOTO_HEADERS[] = {
    "Referer: https://play.app/",
    "X-Requested-With: PLAY",
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};
static const int KYOTO_HEADER_COUNT = 3;

static void str_replace_pattern(char *dest, size_t dest_size, const char *src, const char *pattern, const char *replacement) {
    const char *pos = strstr(src, pattern);
    if (!pos) {
        snprintf(dest, dest_size, "%s", src);
        return;
    }
    size_t prefix_len = pos - src;
    snprintf(dest, dest_size, "%.*s%s%s", (int)prefix_len, src, replacement, pos + strlen(pattern));
}

static void format_endpoint_url(char *dest, size_t dest_size, const char *template_str, const char *id_val) {
    char temp[512];
    if (strstr(template_str, "%id%")) {
        str_replace_pattern(temp, sizeof(temp), template_str, "%id%", id_val);
    } else if (strstr(template_str, "{id}")) {
        str_replace_pattern(temp, sizeof(temp), template_str, "{id}", id_val);
    } else if (strstr(template_str, "%s")) {
        snprintf(temp, sizeof(temp), template_str, id_val);
    } else {
        snprintf(temp, sizeof(temp), "%s", template_str);
    }
    snprintf(dest, dest_size, "%s", temp);
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
    snprintf(url, sizeof(url), "https://anilab2.amdapi.click/api/search?query=%s&page=1", enc_query);
    free(enc_query);

    HttpResponse res = http_get(url, NULL, 0);
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
        if (name && cJSON_IsString(name) && name->valuestring && strlen(name->valuestring) > 0) {
            strncpy(items[i].title, name->valuestring, sizeof(items[i].title) - 1);
        }
    }

    cJSON_Delete(root);

    // Hydrate titles for top results if missing
    int hydrate_count = total < 8 ? total : 8;
    for (int i = 0; i < total; i++) {
        if (items[i].title[0] == '\0') {
            if (i < hydrate_count && items[i].id > 0) {
                char post_url[256];
                snprintf(post_url, sizeof(post_url), "https://anilab2.amdapi.click/api/post?id=%lld", items[i].id);
                HttpResponse p_res = http_get(post_url, NULL, 0);
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

    char kyoto_url[256];
    snprintf(kyoto_url, sizeof(kyoto_url), "https://app.kyotoplayer.com/api/v4/post?id=%lld", anime_id);

    HttpResponse k_res = http_get(kyoto_url, NULL, 0);
    if (k_res.status_code != 200 || !k_res.data) {
        http_response_free(&k_res);
        return -1;
    }

    cJSON *k_root = cJSON_Parse(k_res.data);
    http_response_free(&k_res);
    if (!k_root) return -1;

    // Cache servers route template
    cJSON *servers_item = cJSON_GetObjectItemCaseSensitive(k_root, "servers");
    if (servers_item && cJSON_IsString(servers_item) && servers_item->valuestring) {
        strncpy(g_servers_template, servers_item->valuestring, sizeof(g_servers_template) - 1);
    }

    // Cache iframe route template
    cJSON *srv_obj = cJSON_GetObjectItemCaseSensitive(k_root, "server");
    if (srv_obj) {
        if (cJSON_IsString(srv_obj) && srv_obj->valuestring) {
            strncpy(g_iframe_template, srv_obj->valuestring, sizeof(g_iframe_template) - 1);
        } else if (cJSON_IsObject(srv_obj)) {
            cJSON *srv_url = cJSON_GetObjectItemCaseSensitive(srv_obj, "url");
            if (srv_url && cJSON_IsString(srv_url) && srv_url->valuestring) {
                strncpy(g_iframe_template, srv_url->valuestring, sizeof(g_iframe_template) - 1);
            }
        }
    }

    cJSON *ep_url_item = cJSON_GetObjectItemCaseSensitive(k_root, "episodes");
    if (!ep_url_item || !cJSON_IsString(ep_url_item) || !ep_url_item->valuestring) {
        cJSON_Delete(k_root);
        return -1;
    }

    char ep_url_raw[512];
    strncpy(ep_url_raw, ep_url_item->valuestring, sizeof(ep_url_raw) - 1);
    cJSON_Delete(k_root);

    char anime_id_str[32];
    snprintf(anime_id_str, sizeof(anime_id_str), "%lld", anime_id);

    char final_ep_url[512];
    format_endpoint_url(final_ep_url, sizeof(final_ep_url), ep_url_raw, anime_id_str);

    HttpResponse ep_res = http_get(final_ep_url, KYOTO_HEADERS, KYOTO_HEADER_COUNT);
    if (ep_res.status_code != 200 || !ep_res.data) {
        http_response_free(&ep_res);
        return -1;
    }

    cJSON *ep_root = cJSON_Parse(ep_res.data);
    http_response_free(&ep_res);
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
                snprintf(episodes[i].id, sizeof(episodes[i].id), "%lld", (long long)id->valuedouble);
            }
        }

        cJSON *num = cJSON_GetObjectItemCaseSensitive(item, "number");
        if (num) {
            if (cJSON_IsString(num) && num->valuestring) {
                strncpy(episodes[i].number, num->valuestring, sizeof(episodes[i].number) - 1);
            } else if (cJSON_IsNumber(num)) {
                snprintf(episodes[i].number, sizeof(episodes[i].number), "%g", num->valuedouble);
            }
        }

        cJSON *name = cJSON_GetObjectItemCaseSensitive(item, "name");
        if (name && cJSON_IsString(name) && name->valuestring && strlen(name->valuestring) > 0) {
            strncpy(episodes[i].name, name->valuestring, sizeof(episodes[i].name) - 1);
        } else {
            snprintf(episodes[i].name, sizeof(episodes[i].name), "Episode %s", episodes[i].number[0] ? episodes[i].number : episodes[i].id);
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
    format_endpoint_url(url, sizeof(url), g_servers_template, ep_id);

    HttpResponse res = http_get(url, KYOTO_HEADERS, KYOTO_HEADER_COUNT);
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
        if (lang && cJSON_IsString(lang) && lang->valuestring) {
            strncpy(servers[i].lang, lang->valuestring, sizeof(servers[i].lang) - 1);
        } else {
            strncpy(servers[i].lang, "sub", sizeof(servers[i].lang) - 1);
        }

        // Extract language code from server id (e.g. "70219/jpn" -> "jpn")
        const char *slash = strrchr(servers[i].id, '/');
        if (slash && *(slash + 1)) {
            strncpy(servers[i].lang_code, slash + 1, sizeof(servers[i].lang_code) - 1);
        } else {
            strncpy(servers[i].lang_code, servers[i].lang, sizeof(servers[i].lang_code) - 1);
        }

        // Lowercase lang_code
        for (char *p = servers[i].lang_code; *p; p++) *p = (char)tolower((unsigned char)*p);

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

    char iframe_url[512];
    format_endpoint_url(iframe_url, sizeof(iframe_url), g_iframe_template, server_id);

    HttpResponse res = http_get(iframe_url, KYOTO_HEADERS, KYOTO_HEADER_COUNT);
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

    const char *best_url = master_match[0] ? master_match : first_match;
    if (!best_url[0]) {
        return -1; // No .m3u8 found
    }

    snprintf(out_stream->url, sizeof(out_stream->url), "%s", best_url);
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
