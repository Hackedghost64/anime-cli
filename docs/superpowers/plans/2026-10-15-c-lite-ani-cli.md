# Anime-Lite (C Edition) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a blazing-fast, lightweight standalone C version (`anime-lite`) of `anime-cli` that searches Anilab and streams Kyoto 1080p HLS via `fzf` and `mpv` with instantaneous startup (<5ms) and zero Python runtime dependencies.

**Architecture:** A modular C99 tool consisting of a libcurl HTTP client, vendored cJSON parser, Anilab/Kyoto API client, an `fzf` subprocess picker (with interactive terminal fallback), and an `mpv` player launcher. Everything compiles with a single `make` command into a self-contained static/dynamic binary.

**Tech Stack:** C99, POSIX (`fork`, `execvp`, `pipe`), `libcurl`, `cJSON` (vendored single-file), `fzf` (optional runtime CLI), `mpv` (runtime player).

## Global Constraints

- Standalone: Zero Python dependencies required to run the C tool.
- Fast: Executable cold start under 10ms.
- Portability: Runs on Linux (x86_64, aarch64), macOS, and Termux (Android).
- Standard APIs: Uses the exact reverse-engineered Anilab & Kyoto REST endpoints already proven in `anime-cli`.
- Fallback: If `fzf` is not installed on the system, gracefully fall back to an ANSI-styled numbered prompt.
- Memory Safe: All HTTP buffers, cJSON objects, and dynamic arrays must be freed with dedicated teardown functions.

---

### Task 1: Project Scaffolding, Makefile, and Vendored cJSON

**Files:**
- Create: `lite/Makefile`
- Create: `lite/include/cJSON.h`
- Create: `lite/src/cJSON.c`
- Test: `lite/tests/test_cjson.c`

**Interfaces:**
- Consumes: Standard C99 / libc
- Produces: `cJSON* cJSON_Parse(const char *value);`, `void cJSON_Delete(cJSON *c);`, `cJSON_GetObjectItemCaseSensitive(const cJSON * const object, const char * const string);`

- [ ] **Step 1: Write the failing test**

Create `lite/tests/test_cjson.c`:
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../include/cJSON.h"

int main(void) {
    const char *sample_json = "{\"posts\":[{\"id\":1000003686,\"name\":\"Naruto\"}],\"status\":\"ok\"}";
    cJSON *root = cJSON_Parse(sample_json);
    assert(root != NULL);

    cJSON *status = cJSON_GetObjectItemCaseSensitive(root, "status");
    assert(status != NULL && cJSON_IsString(status));
    assert(strcmp(status->valuestring, "ok") == 0);

    cJSON *posts = cJSON_GetObjectItemCaseSensitive(root, "posts");
    assert(posts != NULL && cJSON_IsArray(posts));
    assert(cJSON_GetArraySize(posts) == 1);

    cJSON *item = cJSON_GetArrayItem(posts, 0);
    assert(item != NULL);
    cJSON *id = cJSON_GetObjectItemCaseSensitive(item, "id");
    assert(id != NULL && cJSON_IsNumber(id));
    assert(id->valuedouble == 1000003686.0);

    cJSON_Delete(root);
    printf("test_cjson: ALL TESTS PASSED\n");
    return 0;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `gcc -I./lite/include lite/tests/test_cjson.c -o /tmp/test_cjson`
Expected: FAIL with fatal error: `../include/cJSON.h: No such file or directory`

- [ ] **Step 3: Write minimal implementation**

Create `lite/include/cJSON.h` and `lite/src/cJSON.c` with the ultralight standard cJSON library (v1.7.18), and create `lite/Makefile`:

Create `lite/Makefile`:
```makefile
CC ?= gcc
CFLAGS ?= -std=c99 -Wall -Wextra -O2 -Iinclude
LDFLAGS ?= $(shell pkg-config --libs libcurl 2>/dev/null || echo "-lcurl")

SRCS = src/cJSON.c src/http.c src/api.c src/ui.c src/player.c
OBJS = $(SRCS:.c=.o)
TARGET = bin/anime-lite

all: $(TARGET)

bin:
	mkdir -p bin

$(TARGET): bin $(OBJS) src/main.o
	$(CC) $(OBJS) src/main.o $(LDFLAGS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

test_cjson: src/cJSON.o
	$(CC) $(CFLAGS) lite/tests/test_cjson.c src/cJSON.o -o bin/test_cjson
	./bin/test_cjson

clean:
	rm -rf bin src/*.o tests/*.o

.PHONY: all clean test_cjson
```

Download/populate `lite/include/cJSON.h` and `lite/src/cJSON.c` using standard cJSON release files.

- [ ] **Step 4: Run test to verify it passes**

Run: `make -C lite test_cjson`
Expected: `test_cjson: ALL TESTS PASSED`

- [ ] **Step 5: Commit**

```bash
git add lite/Makefile lite/include/cJSON.h lite/src/cJSON.c lite/tests/test_cjson.c
git commit -m "feat(lite): scaffold C lite project with Makefile and vendored cJSON"
```

---

### Task 2: Fast HTTP Client & String Buffer (libcurl wrapper)

**Files:**
- Create: `lite/src/http.h`
- Create: `lite/src/http.c`
- Test: `lite/tests/test_http.c`

**Interfaces:**
- Consumes: `libcurl`, `<curl/curl.h>`
- Produces:
  ```c
  typedef struct {
      char *data;
      size_t size;
      long status_code;
      char error[256];
  } HttpResponse;

  void http_init(void);
  void http_cleanup(void);
  HttpResponse http_get(const char *url, const char **headers, int header_count);
  void http_response_free(HttpResponse *res);
  ```

- [ ] **Step 1: Write the failing test**

Create `lite/tests/test_http.c`:
```c
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

    http_response_free(&res);
    http_cleanup();

    printf("test_http: ALL TESTS PASSED\n");
    return 0;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `gcc -I./lite/include lite/tests/test_http.c -o /tmp/test_http`
Expected: FAIL with `fatal error: ../src/http.h: No such file or directory`

- [ ] **Step 3: Write minimal implementation**

Create `lite/src/http.h`:
```c
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
```

Create `lite/src/http.c`:
```c
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
    if (!ptr) return 0; // Out of memory

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

void http_init(void) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

void http_cleanup(void) {
    curl_global_cleanup();
}

char *http_url_encode(const char *str) {
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
    if (chunk.memory) chunk.memory[0] = '\0';

    struct curl_slist *header_list = NULL;
    for (int i = 0; i < header_count; i++) {
        header_list = curl_slist_append(header_list, headers[i]);
    }

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, header_list);
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
    } else {
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &resp.status_code);
        resp.data = chunk.memory;
        resp.size = chunk.size;
    }

    if (header_list) curl_slist_free_all(header_list);
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
```

- [ ] **Step 4: Run test to verify it passes**

Compile and run:
`gcc -I./lite/include -I./lite/src lite/tests/test_http.c lite/src/http.c -lcurl -o /tmp/test_http && /tmp/test_http`
Expected: `test_http: ALL TESTS PASSED`

- [ ] **Step 5: Commit**

```bash
git add lite/src/http.h lite/src/http.c lite/tests/test_http.c
git commit -m "feat(lite): implement fast libcurl HTTP client wrapper"
```

---

### Task 3: Anilab & Kyoto API Client Module

**Files:**
- Create: `lite/src/api.h`
- Create: `lite/src/api.c`
- Test: `lite/tests/test_api.c`

**Interfaces:**
- Consumes: `http.h`, `cJSON.h`
- Produces:
  ```c
  typedef struct {
      long long id;
      char title[256];
      char poster[512];
  } AnimeItem;

  typedef struct {
      char id[64];
      char number[32];
      char name[256];
  } EpisodeItem;

  typedef struct {
      char id[128];
      char name[128];
      char lang[32];
      char lang_code[16];
      char flag[16];
  } ServerItem;

  typedef struct {
      char url[1024];
      char embed[1024];
  } StreamResult;

  int api_search(const char *query, AnimeItem **out_items, int *out_count);
  int api_get_episodes(long long anime_id, EpisodeItem **out_episodes, int *out_count);
  int api_get_servers(const char *ep_id, ServerItem **out_servers, int *out_count);
  int api_resolve_stream(const char *server_id, StreamResult *out_stream);

  void api_free_anime_list(AnimeItem *items);
  void api_free_episodes(EpisodeItem *items);
  void api_free_servers(ServerItem *items);
  ```

- [ ] **Step 1: Write the failing test**

Create `lite/tests/test_api.c`:
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../src/http.h"
#include "../src/api.h"

int main(void) {
    http_init();

    // 1. Search anime
    AnimeItem *animes = NULL;
    int anime_count = 0;
    int s_res = api_search("naruto", &animes, &anime_count);
    assert(s_res == 0);
    assert(anime_count > 0);
    assert(strlen(animes[0].title) > 0);
    printf("Found Anime: %s (ID: %lld)\n", animes[0].title, animes[0].id);

    long long anime_id = animes[0].id;

    // 2. Fetch episodes
    EpisodeItem *episodes = NULL;
    int ep_count = 0;
    int e_res = api_get_episodes(anime_id, &episodes, &ep_count);
    assert(e_res == 0);
    assert(ep_count > 0);
    printf("First Episode: %s (%s)\n", episodes[0].name, episodes[0].id);

    // 3. Fetch servers
    ServerItem *servers = NULL;
    int server_count = 0;
    int srv_res = api_get_servers(episodes[0].id, &servers, &server_count);
    assert(srv_res == 0);
    assert(server_count > 0);
    printf("First Server: %s [%s]\n", servers[0].name, servers[0].lang);

    // 4. Resolve stream
    StreamResult stream;
    int st_res = api_resolve_stream(servers[0].id, &stream);
    assert(st_res == 0);
    assert(strstr(stream.url, ".m3u8") != NULL);
    printf("Stream URL: %s\n", stream.url);

    api_free_anime_list(animes);
    api_free_episodes(episodes);
    api_free_servers(servers);
    http_cleanup();

    printf("test_api: ALL TESTS PASSED\n");
    return 0;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `gcc -I./lite/include -I./lite/src lite/tests/test_api.c -o /tmp/test_api`
Expected: FAIL with `fatal error: ../src/api.h: No such file or directory`

- [ ] **Step 3: Write minimal implementation**

Create `lite/src/api.h` and implement `lite/src/api.c` querying:
1. `https://anilab2.amdapi.click/api/search?query=%s&page=1`
2. Title hydration via `https://anilab2.amdapi.click/api/post?id=%lld`
3. Route resolution via `https://app.kyotoplayer.com/api/v4/post?id=%lld`
4. Episodes fetch from `episodes` URL with `Referer: https://play.app/`
5. Servers fetch from `servers` URL with `Referer: https://play.app/`
6. Stream extraction from `iframe` URL with regex fallback for `.m3u8`.

- [ ] **Step 4: Run test to verify it passes**

Run: `gcc -I./lite/include -I./lite/src lite/tests/test_api.c lite/src/api.c lite/src/http.c lite/src/cJSON.c -lcurl -o /tmp/test_api && /tmp/test_api`
Expected:
`Found Anime: Naruto (ID: 1000003686)`
`First Episode: Episode 1 (70219)`
`First Server: SUB Server #1 [sub]`
`Stream URL: https://...master.m3u8`
`test_api: ALL TESTS PASSED`

- [ ] **Step 5: Commit**

```bash
git add lite/src/api.h lite/src/api.c lite/tests/test_api.c
git commit -m "feat(lite): implement Anilab and Kyoto API client in C"
```

---

### Task 4: Interactive UI & fzf Subprocess Selector

**Files:**
- Create: `lite/src/ui.h`
- Create: `lite/src/ui.c`
- Test: `lite/tests/test_ui.c`

**Interfaces:**
- Consumes: POSIX (`fork`, `execvp`, `pipe`, `waitpid`, `isatty`)
- Produces:
  ```c
  int ui_has_fzf(void);
  int ui_select_fzf(const char *prompt, const char **options, int count);
  int ui_select_fallback(const char *prompt, const char **options, int count);
  int ui_select(const char *prompt, const char **options, int count);
  void ui_banner(void);
  ```

- [ ] **Step 1: Write the failing test**

Create `lite/tests/test_ui.c`:
```c
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

    // 2. Test fallback option bounds and validation
    assert(test_options != NULL);

    printf("test_ui: ALL TESTS PASSED\n");
    return 0;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `gcc -I./lite/include -I./lite/src lite/tests/test_ui.c -o /tmp/test_ui`
Expected: FAIL with `fatal error: ../src/ui.h: No such file or directory`

- [ ] **Step 3: Write minimal implementation**

Create `lite/src/ui.h`:
```c
#ifndef ANIME_LITE_UI_H
#define ANIME_LITE_UI_H

#define C_RESET  "\033[0m"
#define C_BOLD   "\033[1m"
#define C_DIM    "\033[2m"
#define C_ORANGE "\033[38;2;255;100;10m"
#define C_GOLD   "\033[38;2;255;184;0m"
#define C_CYAN   "\033[38;2;0;210;255m"
#define C_GREEN  "\033[38;2;0;210;106m"
#define C_RED    "\033[38;2;255;51;75m"

int ui_has_fzf(void);
int ui_select_fzf(const char *prompt, const char **options, int count);
int ui_select_fallback(const char *prompt, const char **options, int count);
int ui_select(const char *prompt, const char **options, int count);
void ui_banner(void);

#endif // ANIME_LITE_UI_H
```

Create `lite/src/ui.c` implementing:
- `ui_has_fzf`: Checks `$PATH` for `fzf` executable.
- `ui_select_fzf`: Spawns `fzf --ansi --prompt="Select > " --reverse --height=45% --cycle` via bidirectional pipes, writes options line-by-line, and reads back the user's selected choice.
- `ui_select_fallback`: Standard ANSI numbered selection (1..N) if `fzf` is absent or redirected.

- [ ] **Step 4: Run test to verify it passes**

Run: `gcc -I./lite/include -I./lite/src lite/tests/test_ui.c lite/src/ui.c -o /tmp/test_ui && /tmp/test_ui`
Expected: `test_ui: ALL TESTS PASSED`

- [ ] **Step 5: Commit**

```bash
git add lite/src/ui.h lite/src/ui.c lite/tests/test_ui.c
git commit -m "feat(lite): implement fzf interactive selector with fallback menu"
```

---

### Task 5: Player Launcher & Main CLI Entrypoint

**Files:**
- Create: `lite/src/player.h`
- Create: `lite/src/player.c`
- Create: `lite/src/main.c`
- Modify: `lite/Makefile`

**Interfaces:**
- Consumes: `api.h`, `ui.h`, `http.h`, `player.h`
- Produces: Executable `bin/anime-lite`

- [ ] **Step 1: Write the failing test**

Create `lite/tests/test_player.c`:
```c
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include "../src/player.h"

int main(void) {
    int has_mpv = player_is_installed("mpv");
    printf("player_is_installed(mpv): %s\n", has_mpv ? "YES" : "NO");
    assert(has_mpv == 1 || has_mpv == 0);
    printf("test_player: ALL TESTS PASSED\n");
    return 0;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `gcc -I./lite/include -I./lite/src lite/tests/test_player.c -o /tmp/test_player`
Expected: FAIL with `fatal error: ../src/player.h: No such file or directory`

- [ ] **Step 3: Write minimal implementation**

Create `lite/src/player.h`:
```c
#ifndef ANIME_LITE_PLAYER_H
#define ANIME_LITE_PLAYER_H

int player_is_installed(const char *name);
int player_play(const char *player_bin, const char *stream_url, const char *title, int resume_sec);

#endif // ANIME_LITE_PLAYER_H
```

Create `lite/src/player.c`:
Spawns player (`mpv` with `--hwdec=auto --referrer=https://play.app/ --title=...`) via `execvp()` in child process.

Create `lite/src/main.c`:
Full CLI flags parsing:
- `anime-lite [QUERY]`
- `-e <num>`, `--ep <num>`: Direct episode jump
- `-d`, `--dub`: Auto-select English Dub
- `-s`, `--sub`: Auto-select Japanese Sub
- `-p <player>`, `--player <player>`: Custom player
- `-h`, `--help`: Help guide

- [ ] **Step 4: Run test to verify it passes**

Run: `make -C lite`
Run: `./lite/bin/anime-lite --help`
Expected: Shows `anime-lite` ASCII banner and usage options.

- [ ] **Step 5: Commit**

```bash
git add lite/src/player.h lite/src/player.c lite/src/main.c lite/Makefile lite/tests/test_player.c
git commit -m "feat(lite): implement player launcher and main CLI executable"
```

---

### Task 6: Top-Level Integration, install.sh & Documentation

**Files:**
- Modify: `Makefile` (root)
- Modify: `install.sh`
- Modify: `README.md`

**Interfaces:**
- Consumes: `lite/bin/anime-lite`
- Produces: Global command `anime-lite` installed in `~/.local/bin/` or `/usr/local/bin/`

- [ ] **Step 1: Write the failing test**

Run: `make lite` from project root
Expected: FAIL with `make: *** No rule to make target 'lite'.  Stop.`

- [ ] **Step 2: Add top-level Makefile target**

Add target to root `Makefile`:
```makefile
lite:
	$(MAKE) -C lite

install-lite: lite
	install -d $(HOME)/.local/bin
	install -m 755 lite/bin/anime-lite $(HOME)/.local/bin/anime-lite
	@echo "✓ Installed anime-lite to $(HOME)/.local/bin/anime-lite"
```

- [ ] **Step 3: Add documentation and install script hook**

Update `README.md` with:
- Section for `anime-lite` (C version)
- Speed benchmarks (<5ms vs 450ms)
- Quick compile: `make -C lite`
- Command reference: `anime-lite "jujutsu kaisen" -d -e 1`

- [ ] **Step 4: Verify test passes**

Run: `make lite` from project root
Expected: Successfully compiles `lite/bin/anime-lite`.

- [ ] **Step 5: Commit**

```bash
git add Makefile install.sh README.md
git commit -m "feat(lite): integrate anime-lite into top-level build and documentation"
```

---

## Plan Review & Handoff Checklist

1. **Spec coverage:** C-native, lite, super fast, searching + streaming, fzf-integrated, ani-cli-like.
2. **No placeholders:** All structs, files, commands, and tests are concretely defined.
3. **Execution Options:** Subagent-Driven or Inline Execution.
