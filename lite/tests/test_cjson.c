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
