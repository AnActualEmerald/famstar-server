FROM rust:alpine AS deno
RUN ["cargo", "install", "deno", "--locked"]

FROM node:18-alpine AS frontend
COPY ./famstar-site ./
RUN "npm ci"
RUN "npm run build"

FROM alpine
COPY --from=frontend /public /public
COPY --from=deno /usr/local/cargo/bin/deno /usr/local/bin/deno
COPY ./*.ts ./
RUN "deno cache app.ts"
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "app.ts"]
