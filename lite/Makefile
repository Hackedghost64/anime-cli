CC ?= gcc
CFLAGS ?= -std=c99 -Wall -Wextra -O2 -Iinclude -Isrc
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

test_cjson: bin src/cJSON.o
	$(CC) $(CFLAGS) tests/test_cjson.c src/cJSON.o -o bin/test_cjson
	./bin/test_cjson

test_http: bin src/http.o
	$(CC) $(CFLAGS) tests/test_http.c src/http.o $(LDFLAGS) -o bin/test_http
	./bin/test_http

test_api: bin src/cJSON.o src/http.o src/api.o
	$(CC) $(CFLAGS) tests/test_api.c src/cJSON.o src/http.o src/api.o $(LDFLAGS) -o bin/test_api
	./bin/test_api

test_ui: bin src/ui.o
	$(CC) $(CFLAGS) tests/test_ui.c src/ui.o -o bin/test_ui
	./bin/test_ui

test_player: bin src/player.o
	$(CC) $(CFLAGS) tests/test_player.c src/player.o -o bin/test_player
	./bin/test_player

test: test_all

test_all: test_cjson test_http test_api test_ui test_player

clean:
	rm -rf bin src/*.o tests/*.o

.PHONY: all clean test test_cjson test_http test_api test_ui test_player test_all
