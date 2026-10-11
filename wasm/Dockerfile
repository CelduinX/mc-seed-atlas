FROM emscripten/emsdk:4.0.15 AS wasm
WORKDIR /app
COPY vendor ./vendor
COPY wasm ./wasm
RUN sh wasm/build.sh
FROM scratch AS export
COPY --from=wasm /app/public/wasm/ /
