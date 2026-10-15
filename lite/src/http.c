#define _POSIX_C_SOURCE 200809L
#include "http.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>

typedef struct {
    char *memory;
    size_t size;
} MemoryChunk;

static size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    MemoryChunk *mem = (MemoryChunk *)userp;

    char *ptr = realloc(mem->memory, mem->size + realsize + 1);
    if (!ptr) {
        return 0; // Out of memory
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = '\0';

    return realsize;
}

void http_init(void) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

void http_cleanup(void) {
    curl_global_cleanup();
}

char *http_url_encode(const char *str) {
    if (!str) return NULL;
    CURL *curl = curl_easy_init();
    if (!curl) return strdup(str);
    char *escaped = curl_easy_escape(curl, str, 0);
    char *res = strdup(escaped ? escaped : str);
    if (escaped) curl_free(escaped);
    curl_easy_cleanup(curl);
    return res;
}

HttpResponse http_get(const char *url, const char **headers, int header_count) {
    HttpResponse resp;
    memset(&resp, 0, sizeof(HttpResponse));

    CURL *curl = curl_easy_init();
    if (!curl) {
        snprintf(resp.error, sizeof(resp.error), "Failed to initialize curl");
        return resp;
    }

    MemoryChunk chunk;
    chunk.memory = malloc(1);
    chunk.size = 0;
    if (chunk.memory) {
        chunk.memory[0] = '\0';
    }

    struct curl_slist *header_list = NULL;
    for (int i = 0; i < header_count; i++) {
        if (headers && headers[i]) {
            header_list = curl_slist_append(header_list, headers[i]);
        }
    }

    curl_easy_setopt(curl, CURLOPT_URL, url);
    if (header_list) {
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, header_list);
    }
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 12L);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
    // Prefer IPv4 to avoid dual-stack connect delays
    curl_easy_setopt(curl, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        snprintf(resp.error, sizeof(resp.error), "%s", curl_easy_strerror(res));
        free(chunk.memory);
        resp.data = NULL;
        resp.size = 0;
        resp.status_code = 0;
    } else {
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &resp.status_code);
        resp.data = chunk.memory;
        resp.size = chunk.size;
    }

    if (header_list) {
        curl_slist_free_all(header_list);
    }
    curl_easy_cleanup(curl);
    return resp;
}

void http_response_free(HttpResponse *res) {
    if (res && res->data) {
        free(res->data);
        res->data = NULL;
        res->size = 0;
    }
}
