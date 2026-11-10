#ifndef ANIME_LITE_CRYPTO_H
#define ANIME_LITE_CRYPTO_H

#include <stddef.h>
#include <stdint.h>

#define SHA256_BLOCK_SIZE 64
#define SHA256_DIGEST_SIZE 32

typedef struct {
    uint32_t state[8];
    uint64_t count;
    uint8_t buffer[SHA256_BLOCK_SIZE];
} SHA256_CTX;

void sha256_init(SHA256_CTX *ctx);
void sha256_update(SHA256_CTX *ctx, const void *data, size_t len);
void sha256_final(SHA256_CTX *ctx, uint8_t digest[SHA256_DIGEST_SIZE]);
void sha256_buffer(const void *data, size_t len, uint8_t digest[SHA256_DIGEST_SIZE]);
void sha256_hex(const void *data, size_t len, char hex_out[65]);

void hmac_sha256(const void *key, size_t key_len, const void *data, size_t data_len, uint8_t digest[SHA256_DIGEST_SIZE]);
void hmac_sha256_hex(const void *key, size_t key_len, const void *data, size_t data_len, char hex_out[65]);

int kyoto_sign_request(
    const char *method,
    const char *path,
    const char *body,
    char headers[16][256],
    const char *out_headers[16],
    int *header_count
);

#endif // ANIME_LITE_CRYPTO_H
