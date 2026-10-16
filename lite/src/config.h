#ifndef ANIME_LITE_CONFIG_H
#define ANIME_LITE_CONFIG_H

typedef struct {
    char anilab_base_url[256];
    char anilab_headers[16][256];
    int anilab_header_count;
    char kyoto_base_url[256];
    char kyoto_headers[16][256];
    int kyoto_header_count;
    char stream_headers[16][256];
    int stream_header_count;
    char config_file[512];
} AppConfig;

const AppConfig *config_get(void);
void config_init(void);

#endif // ANIME_LITE_CONFIG_H
