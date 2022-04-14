import {Logger, Application} from "./deps.ts";

//setup logging
let logger = new Logger();

//handle incoming requests
async function handler(request: Request): Promise<Response> {
    const method = request.method;
    const url = new URL(request.url);

    return new Response(`You made a ${method} request to ${url.pathname}`);
}

let app = new Application();

app.file("/", "./public/index.html");


//start the server
app.start({port: 8800});
logger.info("Server started at http://localhost:8800");