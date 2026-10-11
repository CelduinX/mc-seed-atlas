#!/bin/sh
set -eu
cd /app
mkdir -p /tmp/atlas-cubiomes /app/public/wasm
cat vendor/README.md vendor/cubiomes/LICENSE vendor/patches/LICENSE vendor/jpeg-LICENSE.txt vendor/webp/Apache-LICENSE.txt vendor/webp/COPYING > /app/public/wasm/LICENSES.txt
cp vendor/webp/encode.wasm /app/public/wasm/webp.wasm
cp -R vendor/cubiomes/. /tmp/atlas-cubiomes/
cd /tmp/atlas-cubiomes
patch -p1 < /app/vendor/patches/versions.patch
cp /app/vendor/patches/btree*.h tables/
emcc /app/wasm/biomes.c generator.c noise.c biomes.c layers.c biomenoise.c finders.c \
  -I. -O3 -fwrapv -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=worker,node \
  -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=16777216 -s MAXIMUM_MEMORY=134217728 \
  -s EXPORTED_FUNCTIONS='["_atlas_init","_atlas_tile","_atlas_point","_atlas_spawn"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAP32"]' -o /app/public/wasm/biomes.js

emcc /app/wasm/jpeg.c -O3 -s USE_LIBJPEG=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=worker,node -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=16777216 -s MAXIMUM_MEMORY=67108864 -s EXPORTED_FUNCTIONS='["_atlas_jpeg_begin","_atlas_jpeg_row","_atlas_jpeg_finish","_atlas_jpeg_abort"]' -s EXPORTED_RUNTIME_METHODS='["HEAPU8"]' -o /app/public/wasm/jpeg.js
