#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>
#include "../src/history.h"

int main(void) {
    // Set a custom temporary XDG_DATA_HOME so we don't overwrite user's actual history
    setenv("XDG_DATA_HOME", "/tmp/anime_lite_test_history", 1);

    WatchHistory wh;
    memset(&wh, 0, sizeof(wh));
    wh.anime_id = 1000003686;
    snprintf(wh.anime_title, sizeof(wh.anime_title), "Naruto Shippuden");
    snprintf(wh.ep_id, sizeof(wh.ep_id), "70219");
    snprintf(wh.ep_num, sizeof(wh.ep_num), "12");
    snprintf(wh.ep_name, sizeof(wh.ep_name), "Episode 12 - The Secret Weapon");
    snprintf(wh.server_id, sizeof(wh.server_id), "70219/eng");
    snprintf(wh.server_name, sizeof(wh.server_name), "DUB Server #1");
    snprintf(wh.lang, sizeof(wh.lang), "dub");
    wh.position = 485.5;
    wh.duration = 1420.0;
    wh.updated_at = 1729000000;

    int s_res = history_save(&wh);
    assert(s_res == 0);

    WatchHistory loaded;
    int l_res = history_load_latest(&loaded);
    assert(l_res == 0);

    assert(loaded.anime_id == wh.anime_id);
    assert(strcmp(loaded.anime_title, wh.anime_title) == 0);
    assert(strcmp(loaded.ep_id, wh.ep_id) == 0);
    assert(strcmp(loaded.ep_num, wh.ep_num) == 0);
    assert(strcmp(loaded.ep_name, wh.ep_name) == 0);
    assert(strcmp(loaded.server_id, wh.server_id) == 0);
    assert(strcmp(loaded.lang, wh.lang) == 0);
    assert(loaded.position == wh.position);
    assert(loaded.duration == wh.duration);

    printf("test_history: ALL TESTS PASSED\n");
    return 0;
}
