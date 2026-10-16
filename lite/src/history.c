#define _POSIX_C_SOURCE 200809L

#include "history.h"
#include "cJSON.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

static char g_history_path[1024] = {0};

static void ensure_dir(const char *path) {
    char temp[1024];
    snprintf(temp, sizeof(temp), "%s", path);
    char *p = temp;
    if (*p == '/') p++;
    while (*p) {
        if (*p == '/') {
            *p = '\0';
            mkdir(temp, 0755);
            *p = '/';
        }
        p++;
    }
}

const char *history_get_file_path(void) {
    if (g_history_path[0] != '\0') {
        return g_history_path;
    }

    const char *xdg = getenv("XDG_DATA_HOME");
    if (xdg && xdg[0] != '\0') {
        snprintf(g_history_path, sizeof(g_history_path), "%s/anime-cli/history.json", xdg);
    } else {
        const char *home = getenv("HOME");
        if (!home) home = ".";
        snprintf(g_history_path, sizeof(g_history_path), "%s/.local/share/anime-cli/history.json", home);
    }
    return g_history_path;
}

int history_save(const WatchHistory *h) {
    if (!h) return -1;

    const char *filepath = history_get_file_path();
    ensure_dir(filepath);

    cJSON *root = cJSON_CreateObject();
    if (!root) return -1;

    cJSON_AddNumberToObject(root, "anime_id", (double)h->anime_id);
    cJSON_AddStringToObject(root, "anime_title", h->anime_title);
    cJSON_AddStringToObject(root, "ep_id", h->ep_id);
    cJSON_AddStringToObject(root, "ep_num", h->ep_num);
    cJSON_AddStringToObject(root, "ep_name", h->ep_name);
    cJSON_AddStringToObject(root, "server_id", h->server_id);
    cJSON_AddStringToObject(root, "server_name", h->server_name);
    cJSON_AddStringToObject(root, "lang", h->lang);
    cJSON_AddNumberToObject(root, "position", h->position);
    cJSON_AddNumberToObject(root, "duration", h->duration);
    cJSON_AddNumberToObject(root, "updated_at", (double)(h->updated_at > 0 ? h->updated_at : time(NULL)));

    char *json_str = cJSON_Print(root);
    cJSON_Delete(root);

    if (!json_str) return -1;

    FILE *f = fopen(filepath, "w");
    if (!f) {
        free(json_str);
        return -1;
    }

    fputs(json_str, f);
    fclose(f);
    free(json_str);
    return 0;
}

int history_load_latest(WatchHistory *h) {
    if (!h) return -1;
    memset(h, 0, sizeof(WatchHistory));

    const char *filepath = history_get_file_path();
    FILE *f = fopen(filepath, "r");
    if (!f) return -1;

    fseek(f, 0, SEEK_END);
    long len = ftell(f);
    fseek(f, 0, SEEK_SET);

    if (len <= 0) {
        fclose(f);
        return -1;
    }

    char *buf = malloc(len + 1);
    if (!buf) {
        fclose(f);
        return -1;
    }

    size_t read_bytes = fread(buf, 1, len, f);
    fclose(f);
    buf[read_bytes] = '\0';

    cJSON *root = cJSON_Parse(buf);
    free(buf);
    if (!root) return -1;

    cJSON *item = NULL;
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "anime_id")) && cJSON_IsNumber(item)) {
        h->anime_id = (long long)item->valuedouble;
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "anime_title")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->anime_title, sizeof(h->anime_title), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "ep_id")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->ep_id, sizeof(h->ep_id), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "ep_num")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->ep_num, sizeof(h->ep_num), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "ep_name")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->ep_name, sizeof(h->ep_name), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "server_id")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->server_id, sizeof(h->server_id), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "server_name")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->server_name, sizeof(h->server_name), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "lang")) && cJSON_IsString(item) && item->valuestring) {
        snprintf(h->lang, sizeof(h->lang), "%s", item->valuestring);
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "position")) && cJSON_IsNumber(item)) {
        h->position = item->valuedouble;
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "duration")) && cJSON_IsNumber(item)) {
        h->duration = item->valuedouble;
    }
    if ((item = cJSON_GetObjectItemCaseSensitive(root, "updated_at")) && cJSON_IsNumber(item)) {
        h->updated_at = (long long)item->valuedouble;
    }

    cJSON_Delete(root);

    // Basic validity check
    if (h->anime_id <= 0 || h->ep_id[0] == '\0') {
        return -1;
    }
    return 0;
}
