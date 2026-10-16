#define _POSIX_C_SOURCE 200809L

#include "config.h"
#include "cJSON.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static AppConfig g_config;
static int g_config_initialized = 0;

static void set_default_config(AppConfig *cfg) {
    memset(cfg, 0, sizeof(AppConfig));

    snprintf(cfg->anilab_base_url, sizeof(cfg->anilab_base_url), "https://anilab2.amdapi.click/api");
    snprintf(cfg->kyoto_base_url, sizeof(cfg->kyoto_base_url), "https://app.kyotoplayer.com/api/v4");

    // Anilab default headers
    snprintf(cfg->anilab_headers[0], 256, "Accept: application/json");
    snprintf(cfg->anilab_headers[1], 256, "Content-Type: application/json");
    snprintf(cfg->anilab_headers[2], 256, "os-version: 35");
    snprintf(cfg->anilab_headers[3], 256, "app-id: com.xo.anilab");
    snprintf(cfg->anilab_headers[4], 256, "app-version: 105");
    snprintf(cfg->anilab_headers[5], 256, "os-id: ");
    snprintf(cfg->anilab_headers[6], 256, "User-Agent: okhttp/4.12.0");
    cfg->anilab_header_count = 7;

    // Kyoto default headers
    snprintf(cfg->kyoto_headers[0], 256, "Accept: application/json");
    snprintf(cfg->kyoto_headers[1], 256, "Content-Type: application/json");
    snprintf(cfg->kyoto_headers[2], 256, "os-version: 35");
    snprintf(cfg->kyoto_headers[3], 256, "app-id: com.kyotoplayer");
    snprintf(cfg->kyoto_headers[4], 256, "app-version: 126");
    snprintf(cfg->kyoto_headers[5], 256, "User-Agent: okhttp/4.12.0");
    cfg->kyoto_header_count = 6;

    // Stream default headers
    snprintf(cfg->stream_headers[0], 256, "Referer: https://play.app/");
    snprintf(cfg->stream_headers[1], 256, "X-Requested-With: PLAY");
    snprintf(cfg->stream_headers[2], 256, "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    cfg->stream_header_count = 3;
}

static void parse_headers_object(cJSON *obj, char target[][256], int *count, int max_count) {
    if (!obj || !cJSON_IsObject(obj)) return;
    *count = 0;
    cJSON *child = obj->child;
    while (child && *count < max_count) {
        if (child->string && cJSON_IsString(child) && child->valuestring) {
            snprintf(target[*count], 256, "%s: %s", child->string, child->valuestring);
            (*count)++;
        }
        child = child->next;
    }
}

void config_init(void) {
    if (g_config_initialized) return;

    set_default_config(&g_config);

    const char *home = getenv("HOME");
    if (!home) home = ".";
    const char *xdg = getenv("XDG_CONFIG_HOME");

    char p_env[512] = {0};
    char p_xdg[512] = {0};
    char p_home[512] = {0};
    char p_share[512] = {0};

    if (getenv("ANIME_CLI_CONFIG")) {
        snprintf(p_env, sizeof(p_env), "%s", getenv("ANIME_CLI_CONFIG"));
    }
    if (xdg && xdg[0] != '\0') {
        snprintf(p_xdg, sizeof(p_xdg), "%s/anime-cli/config.json", xdg);
    }
    snprintf(p_home, sizeof(p_home), "%s/.config/anime-cli/config.json", home);
    snprintf(p_share, sizeof(p_share), "%s/.local/share/anime-cli/config.json", home);

    const char *candidates[] = {
        p_env,
        p_xdg,
        p_home,
        p_share,
        "./config.json",
        "../config.json"
    };
    int num_candidates = sizeof(candidates) / sizeof(candidates[0]);

    for (int i = 0; i < num_candidates; i++) {
        if (candidates[i][0] == '\0') continue;
        if (access(candidates[i], R_OK) == 0) {
            FILE *f = fopen(candidates[i], "r");
            if (f) {
                fseek(f, 0, SEEK_END);
                long len = ftell(f);
                fseek(f, 0, SEEK_SET);
                if (len > 0) {
                    char *buf = malloc(len + 1);
                    if (buf) {
                        size_t r = fread(buf, 1, len, f);
                        buf[r] = '\0';
                        cJSON *root = cJSON_Parse(buf);
                        free(buf);
                        if (root) {
                            snprintf(g_config.config_file, sizeof(g_config.config_file), "%s", candidates[i]);

                            cJSON *an = cJSON_GetObjectItemCaseSensitive(root, "anilab");
                            if (an && cJSON_IsObject(an)) {
                                cJSON *b = cJSON_GetObjectItemCaseSensitive(an, "base_url");
                                if (b && cJSON_IsString(b) && b->valuestring) {
                                    snprintf(g_config.anilab_base_url, sizeof(g_config.anilab_base_url), "%s", b->valuestring);
                                }
                                cJSON *hdrs = cJSON_GetObjectItemCaseSensitive(an, "headers");
                                if (hdrs) {
                                    parse_headers_object(hdrs, g_config.anilab_headers, &g_config.anilab_header_count, 16);
                                }
                            }

                            cJSON *ky = cJSON_GetObjectItemCaseSensitive(root, "kyoto");
                            if (ky && cJSON_IsObject(ky)) {
                                cJSON *b = cJSON_GetObjectItemCaseSensitive(ky, "base_url");
                                if (b && cJSON_IsString(b) && b->valuestring) {
                                    snprintf(g_config.kyoto_base_url, sizeof(g_config.kyoto_base_url), "%s", b->valuestring);
                                }
                                cJSON *hdrs = cJSON_GetObjectItemCaseSensitive(ky, "headers");
                                if (hdrs) {
                                    parse_headers_object(hdrs, g_config.kyoto_headers, &g_config.kyoto_header_count, 16);
                                }
                                cJSON *shdrs = cJSON_GetObjectItemCaseSensitive(ky, "stream_headers");
                                if (shdrs) {
                                    parse_headers_object(shdrs, g_config.stream_headers, &g_config.stream_header_count, 16);
                                }
                            }

                            cJSON_Delete(root);
                            fclose(f);
                            break;
                        }
                    }
                }
                fclose(f);
            }
        }
    }

    // Environment overrides take highest precedence
    const char *env_anilab = getenv("ANILAB_BASE_URL");
    if (env_anilab && env_anilab[0] != '\0') {
        snprintf(g_config.anilab_base_url, sizeof(g_config.anilab_base_url), "%s", env_anilab);
    }
    const char *env_kyoto = getenv("KYOTO_BASE_URL");
    if (env_kyoto && env_kyoto[0] != '\0') {
        snprintf(g_config.kyoto_base_url, sizeof(g_config.kyoto_base_url), "%s", env_kyoto);
    }

    g_config_initialized = 1;
}

const AppConfig *config_get(void) {
    if (!g_config_initialized) {
        config_init();
    }
    return &g_config;
}
