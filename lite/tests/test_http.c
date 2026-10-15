#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../src/http.h"

int main(void) {
    http_init();

    const char *headers[] = {
        "Accept: application/json",
        "User-Agent: okhttp/4.12.0"
    };

    // Test a real reliable lightweight endpoint
    HttpResponse res = http_get("https://anilab2.amdapi.click/api/search?query=naruto&page=1", headers, 2);
    assert(res.status_code == 200);
    assert(res.data != NULL);
    assert(res.size > 0);
    assert(strstr(res.data, "posts") != NULL);

    // Test URL encoding
    char *encoded = http_url_encode("naruto shippuden & friends!");
    assert(encoded != NULL);
    assert(strstr(encoded, "naruto%20shippuden") != NULL || strstr(encoded, "naruto+shippuden") != NULL);
    free(encoded);

    http_response_free(&res);
    http_cleanup();

    printf("test_http: ALL TESTS PASSED\n");
    return 0;
}
