#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include "../src/ui.h"

int main(void) {
    // 1. Check fzf detector
    int has_fzf = ui_has_fzf();
    printf("ui_has_fzf: %s\n", has_fzf ? "YES" : "NO");

    const char *test_options[] = {
        "Option 1: Naruto",
        "Option 2: Bleach",
        "Option 3: One Piece"
    };

    // 2. Test bounds and validation
    assert(test_options != NULL);
    assert(ui_select(NULL, NULL, 0) == -1);
    assert(ui_select("prompt", NULL, 0) == -1);
    assert(ui_select_fzf("prompt", NULL, 0) == -1);
    assert(ui_select_fallback("prompt", NULL, 0) == -1);

    // 3. Test banner doesn't crash
    ui_banner();

    printf("test_ui: ALL TESTS PASSED\n");
    return 0;
}
