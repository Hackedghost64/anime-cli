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
