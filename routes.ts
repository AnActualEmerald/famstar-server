import { serveFile } from "./deps.ts";

export class Router {
  routes: IRoute;
  constructor(routes: IRoute) {
    this.routes = routes;
  }

  async get(req: Request): Response {
    const url = new URL(req.url);
    // if (url.pathname.endsWith(".")) {

    return await serveFile(req, "../frontend/dist/" + url.pathname);
    // }else if (url.pathname.search({
    // }
  }
}

interface IRoute {
  path: String;
}
