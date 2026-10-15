#define _POSIX_C_SOURCE 200809L

#include "ui.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int ui_has_fzf(void) {
    const char *path = getenv("PATH");
    if (!path) return 0;
    char *path_copy = strdup(path);
    if (!path_copy) return 0;

    char *saveptr = NULL;
    char *dir = strtok_r(path_copy, ":", &saveptr);
    int found = 0;
    char fullpath[1024];

    while (dir != NULL) {
        snprintf(fullpath, sizeof(fullpath), "%s/fzf", dir);
        if (access(fullpath, X_OK) == 0) {
            found = 1;
            break;
        }
        dir = strtok_r(NULL, ":", &saveptr);
    }

    free(path_copy);
    return found;
}

static void strip_ansi(const char *src, char *dst, size_t dst_size) {
    if (!src || !dst || dst_size == 0) return;
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j + 1 < dst_size; ) {
        if (src[i] == '\033' && src[i + 1] == '[') {
            i += 2;
            while (src[i] != '\0' && !((src[i] >= 'a' && src[i] <= 'z') || (src[i] >= 'A' && src[i] <= 'Z'))) {
                i++;
            }
            if (src[i] != '\0') i++; // Skip terminating letter
        } else {
            dst[j++] = src[i++];
        }
    }
    dst[j] = '\0';
}

int ui_select_fzf(const char *prompt, const char **options, int count) {
    if (count <= 0 || !options) return -1;

    int in_pipe[2];   // Parent -> Child (stdin)
    int out_pipe[2];  // Child -> Parent (stdout)

    if (pipe(in_pipe) != 0) return -1;
    if (pipe(out_pipe) != 0) {
        close(in_pipe[0]);
        close(in_pipe[1]);
        return -1;
    }

    pid_t pid = fork();
    if (pid < 0) {
        close(in_pipe[0]);
        close(in_pipe[1]);
        close(out_pipe[0]);
        close(out_pipe[1]);
        return -1;
    }

    if (pid == 0) {
        // Child
        close(in_pipe[1]);
        close(out_pipe[0]);

        if (dup2(in_pipe[0], STDIN_FILENO) < 0) exit(1);
        close(in_pipe[0]);

        if (dup2(out_pipe[1], STDOUT_FILENO) < 0) exit(1);
        close(out_pipe[1]);

        char prompt_arg[512];
        snprintf(prompt_arg, sizeof(prompt_arg), "--prompt=%s", prompt ? prompt : "> ");

        char *const argv[] = {
            "fzf",
            "--ansi",
            prompt_arg,
            "--reverse",
            "--height=45%",
            "--cycle",
            NULL
        };

        execvp("fzf", argv);
        exit(127);
    }

    // Parent
    close(in_pipe[0]);
    close(out_pipe[1]);

    for (int i = 0; i < count; i++) {
        if (options[i]) {
            size_t len = strlen(options[i]);
            ssize_t written = 0;
            while ((size_t)written < len) {
                ssize_t w = write(in_pipe[1], options[i] + written, len - written);
                if (w <= 0) break;
                written += w;
            }
            if (write(in_pipe[1], "\n", 1) <= 0) break;
        }
    }
    close(in_pipe[1]);

    char buf[1024];
    size_t total = 0;
    ssize_t bytes_read;
    while ((bytes_read = read(out_pipe[0], buf + total, sizeof(buf) - 1 - total)) > 0) {
        total += bytes_read;
        if (total >= sizeof(buf) - 1) break;
    }
    buf[total] = '\0';
    close(out_pipe[0]);

    int status;
    waitpid(pid, &status, 0);

    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0 || total == 0) {
        return -1;
    }

    while (total > 0 && (buf[total - 1] == '\n' || buf[total - 1] == '\r')) {
        buf[--total] = '\0';
    }

    char stripped_buf[1024];
    strip_ansi(buf, stripped_buf, sizeof(stripped_buf));

    // Exact or ANSI-stripped match
    for (int i = 0; i < count; i++) {
        if (options[i]) {
            if (strcmp(buf, options[i]) == 0) return i;
            char stripped_opt[1024];
            strip_ansi(options[i], stripped_opt, sizeof(stripped_opt));
            if (strcmp(stripped_buf, stripped_opt) == 0) return i;
        }
    }

    // Substring fallback
    for (int i = 0; i < count; i++) {
        if (options[i]) {
            char stripped_opt[1024];
            strip_ansi(options[i], stripped_opt, sizeof(stripped_opt));
            if (strstr(stripped_opt, stripped_buf) != NULL || strstr(stripped_buf, stripped_opt) != NULL) {
                return i;
            }
        }
    }

    return -1;
}

int ui_select_fallback(const char *prompt, const char **options, int count) {
    if (count <= 0 || !options) return -1;

    printf("\n%s%s%s%s\n", C_BOLD, C_CYAN, prompt ? prompt : "Select an option:", C_RESET);
    for (int i = 0; i < count; i++) {
        printf("  %s%s[%d]%s %s\n", C_BOLD, C_GOLD, i + 1, C_RESET, options[i] ? options[i] : "");
    }
    printf("%sSelect [1-%d] (0 to cancel): %s", C_BOLD, count, C_RESET);
    fflush(stdout);

    char line[128];
    if (!fgets(line, sizeof(line), stdin)) {
        return -1;
    }

    int choice = atoi(line);
    if (choice >= 1 && choice <= count) {
        return choice - 1;
    }
    return -1;
}

int ui_select(const char *prompt, const char **options, int count) {
    if (count <= 0 || !options) return -1;
    if (ui_has_fzf() && isatty(STDIN_FILENO)) {
        int choice = ui_select_fzf(prompt, options, count);
        if (choice >= 0) return choice;
        return -1;
    }
    return ui_select_fallback(prompt, options, count);
}

void ui_banner(void) {
    printf("%s%s", C_BOLD, C_ORANGE);
    printf("    _          _                      _     _ _       \n");
    printf("   / \\   _ __ (_)_ __ ___   ___      | |   (_) |_ ___ \n");
    printf("  / _ \\ | '_ \\| | '_ ` _ \\ / _ \\_____| |   | | __/ _ \\\n");
    printf(" / ___ \\| | | | | | | | | |  __/_____| |___| | ||  __/\n");
    printf("/_/   \\_\\_| |_|_|_| |_| |_|\\___|     |_____|_|\\__\\___|\n");
    printf("%s", C_RESET);
    printf("%s%s       Stream Anime via Anilab & Kyoto [C Edition]%s\n\n", C_DIM, C_GOLD, C_RESET);
}
