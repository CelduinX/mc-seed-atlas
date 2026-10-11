/* Independent native invocation of the pinned Cubiomes spawn estimator. */
#include "generator.h"
#include "finders.h"
#include <stdio.h>
#include <stdint.h>
int main(void) {
    const int versions[] = {MC_26_1, MC_26_1_1, MC_26_1_2, MC_26_2, MC_26_3};
    const char *names[] = {"26.1", "26.1.1", "26.1.2", "26.2", "26.3"};
    const int64_t seeds[] = {0, 123456789, -123456789, INT64_MIN, INT64_MAX};
    Generator g;
    printf("["); int first = 1;
    for (int version = 0; version < 5; version++) for (int large = 0; large < 2; large++) for (int i = 0; i < 5; i++) {
        setupGenerator(&g, versions[version], large ? LARGE_BIOMES : 0);
        applySeed(&g, DIM_OVERWORLD, (uint64_t)seeds[i]);
        Pos p = estimateSpawn(&g, NULL);
        printf("%s{\"version\":\"%s\",\"large\":%d,\"seed\":\"%lld\",\"x\":%d,\"z\":%d}",first ? "" : ",",names[version],large,(long long)seeds[i],p.x,p.z); first=0;
    }
    puts("]"); return 0;
}
