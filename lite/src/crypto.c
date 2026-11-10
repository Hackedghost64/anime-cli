#include "crypto.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <fcntl.h>
#include <unistd.h>

#define ROTR(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
#define CH(x, y, z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x, y, z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x) (ROTR(x, 2) ^ ROTR(x, 13) ^ ROTR(x, 22))
#define EP1(x) (ROTR(x, 6) ^ ROTR(x, 11) ^ ROTR(x, 25))
#define SIG0(x) (ROTR(x, 7) ^ ROTR(x, 18) ^ ((x) >> 3))
#define SIG1(x) (ROTR(x, 17) ^ ROTR(x, 19) ^ ((x) >> 10))

static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

void sha256_init(SHA256_CTX *ctx) {
    ctx->state[0] = 0x6a09e667;
    ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372;
    ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f;
    ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab;
    ctx->state[7] = 0x5be0cd19;
    ctx->count = 0;
}

static void sha256_transform(uint32_t state[8], const uint8_t data[64]) {
    uint32_t a = state[0], b = state[1], c = state[2], d = state[3];
    uint32_t e = state[4], f = state[5], g = state[6], h = state[7];
    uint32_t m[64];

    for (int i = 0; i < 16; i++) {
        m[i] = ((uint32_t)data[i * 4] << 24) |
               ((uint32_t)data[i * 4 + 1] << 16) |
               ((uint32_t)data[i * 4 + 2] << 8) |
               ((uint32_t)data[i * 4 + 3]);
    }
    for (int i = 16; i < 64; i++) {
        m[i] = SIG1(m[i - 2]) + m[i - 7] + SIG0(m[i - 15]) + m[i - 16];
    }

    for (int i = 0; i < 64; i++) {
        uint32_t t1 = h + EP1(e) + CH(e, f, g) + K[i] + m[i];
        uint32_t t2 = EP0(a) + MAJ(a, b, c);
        h = g;
        g = f;
        f = e;
        e = d + t1;
        d = c;
        c = b;
        b = a;
        a = t1 + t2;
    }

    state[0] += a;
    state[1] += b;
    state[2] += c;
    state[3] += d;
    state[4] += e;
    state[5] += f;
    state[6] += g;
    state[7] += h;
}

void sha256_update(SHA256_CTX *ctx, const void *data, size_t len) {
    const uint8_t *p = (const uint8_t *)data;
    size_t index = (size_t)(ctx->count & 0x3f);
    ctx->count += len;

    size_t part_len = 64 - index;
    size_t i = 0;

    if (len >= part_len) {
        memcpy(&ctx->buffer[index], p, part_len);
        sha256_transform(ctx->state, ctx->buffer);
        for (i = part_len; i + 63 < len; i += 64) {
            sha256_transform(ctx->state, &p[i]);
        }
        index = 0;
    }
    if (i < len) {
        memcpy(&ctx->buffer[index], &p[i], len - i);
    }
}

void sha256_final(SHA256_CTX *ctx, uint8_t digest[SHA256_DIGEST_SIZE]) {
    uint8_t final_count[8];
    uint64_t bits = ctx->count * 8;
    for (int i = 0; i < 8; i++) {
        final_count[7 - i] = (uint8_t)(bits >> (i * 8));
    }

    size_t index = (size_t)(ctx->count & 0x3f);
    size_t pad_len = (index < 56) ? (56 - index) : (120 - index);

    static const uint8_t padding[64] = { 0x80 };
    sha256_update(ctx, padding, pad_len);
    sha256_update(ctx, final_count, 8);

    for (int i = 0; i < 8; i++) {
        digest[i * 4] = (uint8_t)(ctx->state[i] >> 24);
        digest[i * 4 + 1] = (uint8_t)(ctx->state[i] >> 16);
        digest[i * 4 + 2] = (uint8_t)(ctx->state[i] >> 8);
        digest[i * 4 + 3] = (uint8_t)(ctx->state[i]);
    }
}

void sha256_buffer(const void *data, size_t len, uint8_t digest[SHA256_DIGEST_SIZE]) {
    SHA256_CTX ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, data, len);
    sha256_final(&ctx, digest);
}

void sha256_hex(const void *data, size_t len, char hex_out[65]) {
    uint8_t d[32];
    sha256_buffer(data, len, d);
    for (int i = 0; i < 32; i++) {
        snprintf(hex_out + i * 2, 3, "%02x", d[i]);
    }
    hex_out[64] = '\0';
}

void hmac_sha256(const void *key, size_t key_len, const void *data, size_t data_len, uint8_t digest[SHA256_DIGEST_SIZE]) {
    uint8_t k[64];
    memset(k, 0, sizeof(k));

    if (key_len > 64) {
        sha256_buffer(key, key_len, k);
    } else {
        memcpy(k, key, key_len);
    }

    uint8_t ipad[64], opad[64];
    for (int i = 0; i < 64; i++) {
        ipad[i] = k[i] ^ 0x36;
        opad[i] = k[i] ^ 0x5c;
    }

    uint8_t inner_digest[32];
    SHA256_CTX inner;
    sha256_init(&inner);
    sha256_update(&inner, ipad, 64);
    sha256_update(&inner, data, data_len);
    sha256_final(&inner, inner_digest);

    SHA256_CTX outer;
    sha256_init(&outer);
    sha256_update(&outer, opad, 64);
    sha256_update(&outer, inner_digest, 32);
    sha256_final(&outer, digest);
}

void hmac_sha256_hex(const void *key, size_t key_len, const void *data, size_t data_len, char hex_out[65]) {
    uint8_t d[32];
    hmac_sha256(key, key_len, data, data_len, d);
    for (int i = 0; i < 32; i++) {
        snprintf(hex_out + i * 2, 3, "%02x", d[i]);
    }
    hex_out[64] = '\0';
}

// Kyoto cryptographic parameters
#define KYOTO_CERT_HEX "482a900b2906766b2e8d3cf19fcf6d06d0b6c9569cb6305c9c43200a8e20979e"
#define KYOTO_SECRET_HEX "9589ba06efeb990bafe302235854766f4d5b9cabcb57ad6ad6bb41cd7b6a8408"
#define KYOTO_APP_VERSION "132"
#define KYOTO_OS_VERSION "36"
#define KYOTO_APP_ID "com.kyotoplayer"
#define KYOTO_DEVICE_MODEL "Google Pixel 8"

// Precomputed HMAC-SHA256 signing key from SECRET + CERT (32 bytes)
static const uint8_t KYOTO_SIGNING_KEY[32] = {
    0xa7, 0x29, 0xb0, 0xb7, 0x15, 0x88, 0x2f, 0xd8,
    0xec, 0xe5, 0x76, 0x56, 0x9c, 0x2e, 0x2b, 0x3b,
    0xff, 0xe1, 0x8b, 0x79, 0xbb, 0x37, 0xac, 0x0c,
    0xc4, 0x2b, 0x00, 0xa6, 0x74, 0x52, 0x29, 0x57
};

static void base64url_encode16(const uint8_t in[16], char out[23]) {
    static const char tbl[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    int i = 0, j = 0;
    while (i < 15) {
        uint32_t oct_a = in[i++];
        uint32_t oct_b = in[i++];
        uint32_t oct_c = in[i++];
        uint32_t triple = (oct_a << 16) | (oct_b << 8) | oct_c;
        out[j++] = tbl[(triple >> 18) & 0x3F];
        out[j++] = tbl[(triple >> 12) & 0x3F];
        out[j++] = tbl[(triple >> 6) & 0x3F];
        out[j++] = tbl[triple & 0x3F];
    }
    // Last byte (16th byte) -> 2 characters, no padding '='
    uint32_t triple = (uint32_t)in[15] << 16;
    out[j++] = tbl[(triple >> 18) & 0x3F];
    out[j++] = tbl[(triple >> 12) & 0x3F];
    out[j] = '\0';
}

int kyoto_sign_request(
    const char *method,
    const char *path,
    const char *body,
    char headers[16][256],
    const char *out_headers[16],
    int *header_count
) {
    if (!method || !path || !headers || !out_headers || !header_count) return -1;

    // 1. Timestamp
    time_t now = time(NULL);
    char ts[32];
    snprintf(ts, sizeof(ts), "%ld", (long)now);

    // 2. Nonce (16 random bytes urlsafe base64 encoded)
    uint8_t rand_bytes[16];
    int fd = open("/dev/urandom", O_RDONLY);
    if (fd >= 0) {
        if (read(fd, rand_bytes, sizeof(rand_bytes)) != sizeof(rand_bytes)) {
            for (int i = 0; i < 16; i++) rand_bytes[i] = (uint8_t)rand();
        }
        close(fd);
    } else {
        for (int i = 0; i < 16; i++) rand_bytes[i] = (uint8_t)rand();
    }
    char nonce[32];
    base64url_encode16(rand_bytes, nonce);

    // 3. Body SHA-256
    char body_sha256[65];
    sha256_hex(body ? body : "", body ? strlen(body) : 0, body_sha256);

    // 4. Payload: METHOD\nPATH\nBODY_SHA256\nTS\nNONCE\nAPP_VERSION
    char payload[512];
    snprintf(payload, sizeof(payload), "%s\n%s\n%s\n%s\n%s\n%s",
             method, path, body_sha256, ts, nonce, KYOTO_APP_VERSION);

    // 5. Signature = HMAC-SHA256(SIGNING_KEY, payload)
    char sig[65];
    hmac_sha256_hex(KYOTO_SIGNING_KEY, sizeof(KYOTO_SIGNING_KEY), payload, strlen(payload), sig);

    // 6. Format headers
    snprintf(headers[0], 256, "Accept: application/json");
    snprintf(headers[1], 256, "Content-Type: application/x-www-form-urlencoded");
    snprintf(headers[2], 256, "os-version: %s", KYOTO_OS_VERSION);
    snprintf(headers[3], 256, "app-id: %s", KYOTO_APP_ID);
    snprintf(headers[4], 256, "app-version: %s", KYOTO_APP_VERSION);
    snprintf(headers[5], 256, "device-model: %s", KYOTO_DEVICE_MODEL);
    snprintf(headers[6], 256, "X-Kyoto-Ts: %s", ts);
    snprintf(headers[7], 256, "X-Kyoto-Nonce: %s", nonce);
    snprintf(headers[8], 256, "X-Kyoto-Sig: %s", sig);
    snprintf(headers[9], 256, "X-Kyoto-Cert: %s", KYOTO_CERT_HEX);
    snprintf(headers[10], 256, "User-Agent: okhttp/4.12.0");

    for (int i = 0; i < 11; i++) {
        out_headers[i] = headers[i];
    }
    *header_count = 11;
    return 0;
}
