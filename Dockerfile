FROM rust AS deno
RUN ["cargo", "install", "deno", "--locked"]

FROM node:18-alpine AS frontend
COPY ./famstar-site ./
RUN ["npm", "ci"]
RUN ["npm", "run", "build"]

FROM ubuntu
COPY --from=frontend /build /public
COPY --from=deno /usr/local/cargo/bin/deno /usr/local/bin/deno
COPY ./src/*.ts ./
EXPOSE 8800
VOLUME /data
RUN ["deno", "cache", "app.ts"]
CMD ["deno", "run", "--unsafely-ignore-certificate-errors=$POSTGRES_HOST", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "--unstable", "app.ts"]
