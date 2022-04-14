import {Logger, Application, parse} from "./deps.ts";

//setup logging
let logger = new Logger();

const { args } = Deno;
const DEFAULT_PORT = 8800;
const argPort = parse(args).port;

let app = new Application();

app.file("/", "./public/index.html");


//start the server
app.start({port: argPort ? Number(argPort) : DEFAULT_PORT});