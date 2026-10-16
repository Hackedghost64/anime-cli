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

int player_play_with_progress(const char *player_bin, const char *stream_url, const char *title, int resume_sec, double *out_pos, double *out_dur) {
    if (!stream_url || stream_url[0] == '\0') return -1;

    const char *bin = (player_bin && player_bin[0] != '\0') ? player_bin : "mpv";
    int is_mpv = (strstr(bin, "mpv") != NULL);

    pid_t my_pid = getpid();
    char prog_file[256] = {0};
    char lua_file[256] = {0};

    if (is_mpv) {
        snprintf(prog_file, sizeof(prog_file), "/tmp/anime_lite_prog_%d.txt", (int)my_pid);
        snprintf(lua_file, sizeof(lua_file), "/tmp/anime_lite_hook_%d.lua", (int)my_pid);

        FILE *lf = fopen(lua_file, "w");
        if (lf) {
            fprintf(lf,
                "local prog_file = \"%s\"\n"
                "local last_pos = 0\n"
                "local last_dur = 0\n"
                "mp.observe_property(\"time-pos\", \"number\", function(name, val)\n"
                "    if val then last_pos = val end\n"
                "end)\n"
                "mp.observe_property(\"duration\", \"number\", function(name, val)\n"
                "    if val then last_dur = val end\n"
                "end)\n"
                "mp.register_event(\"shutdown\", function()\n"
                "    local f = io.open(prog_file, \"w\")\n"
                "    if f then\n"
                "        f:write(string.format(\"%%.2f %%.2f\\n\", last_pos, last_dur))\n"
                "        f:close()\n"
                "    end\n"
                "end)\n",
                prog_file
            );
            fclose(lf);
        }
    }

    pid_t pid = fork();
    if (pid < 0) {
        if (lua_file[0]) unlink(lua_file);
        return -1;
    }

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

        char script_arg[512];
        if (is_mpv && lua_file[0]) {
            snprintf(script_arg, sizeof(script_arg), "--script=%s", lua_file);
        }

        const char *user_agent_arg = "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const char *referrer_arg = "--referrer=https://play.app/";
        const char *hwdec_arg = "--hwdec=auto";

        const char *argv[18];
        int argc = 0;
        argv[argc++] = bin;

        if (is_mpv) {
            argv[argc++] = hwdec_arg;
            argv[argc++] = referrer_arg;
            argv[argc++] = user_agent_arg;
            argv[argc++] = title_arg;
            argv[argc++] = force_title_arg;
            if (lua_file[0]) {
                argv[argc++] = script_arg;
            }
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
    int wait_res = waitpid(pid, &status, 0);

    // Read recorded progress
    double pos = 0.0, dur = 0.0;
    if (prog_file[0]) {
        FILE *pf = fopen(prog_file, "r");
        if (pf) {
            if (fscanf(pf, "%lf %lf", &pos, &dur) == 2) {
                if (out_pos) *out_pos = pos;
                if (out_dur) *out_dur = dur;
            }
            fclose(pf);
            unlink(prog_file);
        }
    }
    if (lua_file[0]) {
        unlink(lua_file);
    }

    if (wait_res < 0) return -1;
    return WIFEXITED(status) ? WEXITSTATUS(status) : -1;
}

int player_play(const char *player_bin, const char *stream_url, const char *title, int resume_sec) {
    return player_play_with_progress(player_bin, stream_url, title, resume_sec, NULL, NULL);
}
