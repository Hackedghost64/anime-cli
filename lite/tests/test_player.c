#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include "../src/player.h"

int main(void) {
    int has_mpv = player_is_installed("mpv");
    printf("player_is_installed(mpv): %s\n", has_mpv ? "YES" : "NO");
    assert(has_mpv == 1 || has_mpv == 0);

    // Non-existent binary should return 0
    assert(player_is_installed("non_existent_binary_test_xyz") == 0);
    assert(player_is_installed(NULL) == 0);
    assert(player_is_installed("") == 0);

    // Invalid stream_url should return -1
    assert(player_play("mpv", NULL, "title", 0) == -1);
    assert(player_play("mpv", "", "title", 0) == -1);

    printf("test_player: ALL TESTS PASSED\n");
    return 0;
}
