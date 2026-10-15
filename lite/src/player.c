#define _POSIX_C_SOURCE 200809L

#include "player.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int player_is_installed(const char *name) {
    if (!name || name[0] == '\0') return 0;

    if (strchr(name, '/')) {
        return access(name, X_OK) == 0;
    }

    const char *path = getenv("PATH");
    if (!path) return 0;
    char *path_copy = strdup(path);
    if (!path_copy) return 0;

    char *saveptr = NULL;
    char *dir = strtok_r(path_copy, ":", &saveptr);
    int found = 0;
    char fullpath[1024];

    while (dir != NULL) {
        snprintf(fullpath, sizeof(fullpath), "%s/%s", dir, name);
        if (access(fullpath, X_OK) == 0) {
            found = 1;
            break;
        }
        dir = strtok_r(NULL, ":", &saveptr);
    }

    free(path_copy);
    return found;
}

int player_play(const char *player_bin, const char *stream_url, const char *title, int resume_sec) {
    if (!stream_url || stream_url[0] == '\0') return -1;

    const char *bin = (player_bin && player_bin[0] != '\0') ? player_bin : "mpv";

    pid_t pid = fork();
    if (pid < 0) return -1;

    if (pid == 0) {
        // Child process
        char title_arg[512];
        snprintf(title_arg, sizeof(title_arg), "--title=%s", title ? title : "Anime-Lite");

        char force_title_arg[512];
        snprintf(force_title_arg, sizeof(force_title_arg), "--force-media-title=%s", title ? title : "Anime-Lite");

        char start_arg[64];
        if (resume_sec > 0) {
            snprintf(start_arg, sizeof(start_arg), "--start=%d", resume_sec);
        }

        const char *user_agent_arg = "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const char *referrer_arg = "--referrer=https://play.app/";
        const char *hwdec_arg = "--hwdec=auto";

        const char *argv[16];
        int argc = 0;
        argv[argc++] = bin;

        if (strstr(bin, "mpv") != NULL) {
            argv[argc++] = hwdec_arg;
            argv[argc++] = referrer_arg;
            argv[argc++] = user_agent_arg;
            argv[argc++] = title_arg;
            argv[argc++] = force_title_arg;
            if (resume_sec > 0) {
                argv[argc++] = start_arg;
            }
        }
        argv[argc++] = stream_url;
        argv[argc++] = NULL;

        execvp(bin, (char *const *)argv);
        perror("execvp");
        exit(127);
    }

    int status;
    if (waitpid(pid, &status, 0) < 0) return -1;

    return WIFEXITED(status) ? WEXITSTATUS(status) : -1;
}
