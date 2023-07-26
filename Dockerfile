FROM node:18-alpine AS frontend
COPY ./famstar-site ./
RUN ["npm", "ci"]
RUN ["npm", "run", "build"]

FROM lukechannings/deno
COPY --from=frontend /build /app/public
COPY ./src /app/src
COPY ./deno.lock /app/deno.lock
EXPOSE 8800
EXPOSE 8801
VOLUME /app/data
WORKDIR /app
RUN deno cache src/app.ts --lock
ENTRYPOINT ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "src/app.ts"]
