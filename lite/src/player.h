#ifndef ANIME_LITE_PLAYER_H
#define ANIME_LITE_PLAYER_H

int player_is_installed(const char *name);
int player_play(const char *player_bin, const char *stream_url, const char *title, int resume_sec);
int player_play_with_progress(const char *player_bin, const char *stream_url, const char *title, int resume_sec, double *out_pos, double *out_dur);

#endif // ANIME_LITE_PLAYER_H
