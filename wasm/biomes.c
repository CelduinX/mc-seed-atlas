#include "generator.h"
#include "finders.h"
#include <stdlib.h>
#include <stdint.h>

static Generator generator;
static int *buffer;
static size_t capacity;

int atlas_init(int version, int large, uint32_t low, uint32_t high) {
    const int versions[] = {MC_26_1, MC_26_1_1, MC_26_1_2, MC_26_2, MC_26_3};
    if (version < 0 || version > 4 || (large != 0 && large != 1)) return -1;
    setupGenerator(&generator, versions[version], large ? LARGE_BIOMES : 0);
    applySeed(&generator, DIM_OVERWORLD, ((uint64_t)high << 32) | low);
    return 0;
}

int *atlas_tile(int scale, int x, int z, int width, int height) {
    if ((scale != 1 && scale != 4 && scale != 16 && scale != 64) || width < 1 || height < 1 || width > 128 || height > 128) return NULL;
    Range range = {scale, x, z, width, height, scale == 1 ? 64 : 16, 1};
    size_t required = getMinCacheSize(&generator, scale, width, 1, height);
    if (required > capacity) {
        int *next = realloc(buffer, required * sizeof(int));
        if (!next) return NULL;
        buffer = next;
        capacity = required;
    }
    if (genBiomes(&generator, buffer, range)) return NULL;
    return buffer;
}

int atlas_point(int x, int z) { return getBiomeAt(&generator, 1, x, 64, z); }

static int spawn_position[2];
int *atlas_spawn(void) {
    Pos p = estimateSpawn(&generator, NULL);
    spawn_position[0] = p.x; spawn_position[1] = p.z;
    return spawn_position;
}
