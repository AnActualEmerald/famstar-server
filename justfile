build:
	docker-compose build
	
dev: build
	docker-compose up

deno: 
	deno run --unstable --unsafely-ignore-certificate-errors=$POSTGRES_HOST -A src/app.ts
