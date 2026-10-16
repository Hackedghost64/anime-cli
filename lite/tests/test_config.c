#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../src/config.h"

int main(void) {
    config_init();
    const AppConfig *cfg = config_get();
    assert(cfg != NULL);

    assert(strlen(cfg->anilab_base_url) > 0);
    assert(strstr(cfg->anilab_base_url, "http") != NULL);
    assert(strlen(cfg->kyoto_base_url) > 0);
    assert(strstr(cfg->kyoto_base_url, "http") != NULL);

    assert(cfg->anilab_header_count > 0);
    assert(cfg->kyoto_header_count > 0);
    assert(cfg->stream_header_count > 0);

    printf("Config File Found: %s\n", cfg->config_file[0] ? cfg->config_file : "(built-in defaults)");
    printf("Anilab Base URL:   %s (%d headers)\n", cfg->anilab_base_url, cfg->anilab_header_count);
    printf("Kyoto Base URL:    %s (%d headers)\n", cfg->kyoto_base_url, cfg->kyoto_header_count);

    printf("test_config: ALL TESTS PASSED\n");
    return 0;
}
