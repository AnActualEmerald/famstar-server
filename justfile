set dotenv-load := true

build:
	docker-compose build
	
dev: build
	docker-compose up

run file='src/app.ts': 
	deno run -A {{file}}

cache file='src/app.ts':
	deno cache {{file}} --lock
