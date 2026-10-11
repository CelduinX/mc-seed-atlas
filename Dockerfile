FROM emscripten/emsdk:4.0.15 AS wasm
WORKDIR /app
COPY vendor ./vendor
COPY wasm ./wasm
RUN sh wasm/build.sh

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY . .
COPY --from=wasm /app/public/wasm /app/public/wasm
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY . .
COPY --from=wasm /app/public/wasm /app/public/wasm
RUN npm run build

FROM nginx:stable-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
