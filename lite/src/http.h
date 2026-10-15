#ifndef ANIME_LITE_HTTP_H
#define ANIME_LITE_HTTP_H

#include <stddef.h>

typedef struct {
    char *data;
    size_t size;
    long status_code;
    char error[256];
} HttpResponse;

void http_init(void);
void http_cleanup(void);
HttpResponse http_get(const char *url, const char **headers, int header_count);
char *http_url_encode(const char *str);
void http_response_free(HttpResponse *res);

#endif // ANIME_LITE_HTTP_H
