# Pinned generator sources

Cubiomes: https://github.com/Cubitect/cubiomes/tree/e61f90580cbdd883214a8054670dacae655e59c0 (MIT; see cubiomes/LICENSE).

Version patch and biome trees: https://github.com/fwsoapy/seedforge/tree/8cb704bbde7e0de557060be06d51d8305280f11b/vendor/patches (MIT; see patches/LICENSE). The 1.21.5 tree is attributed upstream to EZ Seed Finder; the 26.2 tree to SeedMapper via MCBE-seedcracker. The biome generator and estimated spawn finder are compiled; unused structure placement, search and Bedrock functions are removed by the WASM linker.

The original Cubiomes source remains untouched. The patch is applied to a temporary copy during the Emscripten 4.0.15 build. Generated assets are served locally from public/wasm.

JPEG export: IJG libjpeg 9f (14-Jan-2024), the USE_LIBJPEG port pinned by Emscripten 4.0.15, https://www.ijg.org/files/jpegsrc.v9f.tar.gz. See jpeg-LICENSE.txt. This software is based in part on the work of the Independent JPEG Group. The upstream library is unmodified; wasm/jpeg.c is the application's streaming wrapper. The export uses quality 90 with no chroma subsampling.

Lossless WebP export: @jsquash/webp 1.5.0 (Jamie Sinclair; Squoosh/Google), pinned in package-lock.json, https://github.com/jamsinclair/jSquash. The unmodified non-SIMD encoder binary is copied from codec/enc/webp_enc.wasm to vendor/webp/encode.wasm and served locally as /wasm/webp.wasm. The JS wrapper is bundled by Vite. Apache-2.0 license: webp/Apache-LICENSE.txt; underlying libwebp BSD license: webp/COPYING. No external encoding service is used. Biome samples are calculated once, then the smaller of lossless WebP and quality-90 JPEG is downloaded. Only the captured visible region is exported.

Spawn reference fixtures are produced separately by compiling wasm/spawn-reference.c against the patched source with native GCC -O3 -fwrapv and comparing its output with WASM. They validate the estimate, not Vanilla's terrain-dependent spawn.
