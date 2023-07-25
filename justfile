build:
	docker-compose build
	
dev: build
	docker-compose up

run file='src/app.ts': 
	deno run -A {{file}}
