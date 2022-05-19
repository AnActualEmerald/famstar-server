# famstar-server
Server for my famstar project. Serves a single page app to `/` and listens for [earthstar](https://github.com/earthstar-project/earthstar) connections on `/earthstar`.

## Docker
A docker image is available at `emerald119/famstar-server` with both x86_64 and arm64 support

## Getting started

Clone this repo and run `git submodules init` to pull down the frontend repo from [famstar-site](https://github.com/AnActualEmerald/famstar-site).

Ensure that the `SHARE` environment variable is set to a valid Earthstar share address. This will be the only share allowed to sync with the server. The `KEY` environment variable should be set as well. This will be used to make sure that no randos can send things to your share (the security of this will be improved in the future).

### Running with docker-compose (recommended)

- Set `SHARE` and `KEY` in a `.env` file in the root directory of the repo
- Optionally edit the `compose.yaml` file to change which port the server will listen on. Defaults to `8800`
- Start the server with `docker-compose up`

### Running with the [just](https://github.com/casey/just) command runner

- Make sure just is installed and in your `PATH` (`cargo install just`)
- Run `just start` to build the front end and start the server

### Running manually

- Remove the contents of the `famstar-server/public` directory with `rm -rf ./public/*`
- From `famstar-site/`
  - Install the frontend dependencies with `npm install`
  - Build the static files with `npm run build`
  - Copy those files from `famstar-site/public` to `famstar-server/public`
- From `famstar-server/`
  - Run `deno run --allow-read --allow-write --allow-env --allow-net app.ts` to start the server listening on port `8800`. A port can be specified with the `--port` option.
