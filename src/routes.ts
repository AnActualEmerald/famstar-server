import { FormFile, MultipartReader, R, Router } from "./deps.ts";
import { author, logger, localReplica } from "./app.ts";
import { isErr } from "https://deno.land/x/earthstar@v10.2.1/mod.ts";

const key = Deno.env.get("KEY") as string;
const r = new Router();

r.use((req, res, next) => {
  if (req.headers.get("key")) {
    if (key === req.headers.get("key")) {
      res.locals.key = req.headers.get("key") as string;
      next();
    } else {
      logger.info("API key auth failed");
      res.sendStatus(403);
      next(new Error("Forbidden"));
    }
  } else {
    logger.info("Request had no 'key' header");
    res.sendStatus(403);
    next(new Error("Forbidden"));
  }
});

const { compose, nth, split } = R;
const getBoundary = compose(nth(1), split("="), nth(1), split(";"));

r.use(async (req, res, next) => {
  //handle incoming file uploads
  const ct = req.headers.get("content-type");
  if (ct?.startsWith("multipart/form-data")) {
    logger.info("Parsing multipart/form-data");

    //Replace this with FormData at some point
    const boundary = getBoundary(ct);
    const mr = new MultipartReader(req.raw, boundary);
    const form = await mr.readForm();
    const e = form.entries().next();
    const file = form.files(e.value[0]);
    if (file) {
      res.locals.file = file[0] as FormFile;
    }
    next();
  } else {
    //if there is no form data simply go next
    next();
  }
});

r.put("/message", (req, res) => {
  const now = new Date(Date.now());
  const msg = req.body;
  logger.debug(`/message: ${JSON.stringify(msg)}`);
  if (msg.content) {
    const path = `/messages/${now.getDate()}/${now.getTime()}.msg${
      msg.deleteAfter ? "!" : ""
    }`;
    logger.info(`Adding message '${msg.content}' to replica`);
    msg.deleteAfter ? logger.info(`Deleting at ${msg.deleteAfter}`) : {};

    localReplica?.set(author, {
      text: msg.content,
      path,
      deleteAfter: msg.deleteAfter
        ? new Date(msg.deleteAfter).getTime() * 1000
        : null,
    }).then((v) => {
      if (v.kind === "failure") {
        logger.error(v.err?.message);
        logger.error(v.reason);
        res.sendStatus(500).json({ error: v.err?.message, reason: v.reason });
        return;
      }
      logger.info("OK");
      res.sendStatus(202);
    });
  } else {
    logger.warn(`Got bad request: ${JSON.stringify(msg)}`);
    res.sendStatus(400);
  }
});


r.post("/image", (req, res) => {
  const now = new Date(Date.now());
  // if (res.locals) {
  const temp = req.headers.get("Delete-After");
  const path = `/images/${now.getDate()}/${now.getTime()}.img${
    temp ? "!" : ""
  }`;
  logger.info(
    `Saving image ${(res.locals.file as FormFile).filename} to replica`,
  );
  temp ? logger.info(`Deleting after ${temp}`) : {};
  localReplica?.set(author, {
    text: `created ${now.toDateString()}`,
    attachment: (res.locals.file as FormFile).content,
    path,
    deleteAfter: temp ? new Date(temp).getTime() * 1000 : null,
  }).then((v) => {
    if (v.kind === "failure") {
      logger.error(v.err?.message);
      logger.error(v.reason);
      res.sendStatus(500).json({ error: v.err?.message, reason: v.reason });
      return;
    }
    logger.info("OK");
    res.sendStatus(202);
  });
});

r.get("/docs", async (_, res) => {
  const docs = await localReplica?.queryDocs({
    orderBy: "localIndex ASC",
    historyMode: "latest",
  });

  res.send(JSON.stringify(docs));
});

r.get(/\/delete\/(.*)/, async (req, res) => {
  const path = req.params[0];
  const e = await localReplica?.wipeDocAtPath(author, 
    path,
  );

  if (isErr(e)) {
    logger.error(e.message);
    logger.error(e.cause);
    res.sendStatus(500).json({ error: e.message, reason: e.cause });
    return;
  }

  logger.info(`Overwrote document at ${path}`);

  res.sendStatus(202);
});

export default r;
