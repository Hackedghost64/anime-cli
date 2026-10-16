#ifndef ANIME_LITE_HISTORY_H
#define ANIME_LITE_HISTORY_H

#include <stddef.h>

typedef struct {
    long long anime_id;
    char anime_title[256];
    char ep_id[64];
    char ep_num[32];
    char ep_name[256];
    char server_id[128];
    char server_name[128];
    char lang[32];
    double position;
    double duration;
    long long updated_at;
} WatchHistory;

const char *history_get_file_path(void);
int history_save(const WatchHistory *h);
int history_load_latest(WatchHistory *h);

#endif // ANIME_LITE_HISTORY_H
