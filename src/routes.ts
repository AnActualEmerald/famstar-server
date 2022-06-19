import { FormFile, MultipartReader, R, Router } from "./deps.ts";
import { author, logger, replica } from "./app.ts";

const hash = async (input: string) => {
  return await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
};

const key = Deno.env.get("KEY") as string;
const r = new Router();

r.use((req, res, next) => {
  if (req.headers.get("key")) {
    if (key === req.headers.get("key")) {
      res.locals.key = req.headers.get("key") as string;
      next();
    } else {
      res.sendStatus(403);
      next(new Error("Forbidden"));
    }
  } else {
    res.sendStatus(403);
    next(new Error("Forbidden"));
  }
});

const { compose, nth, split } = R;
const getBoundary = compose(nth(1), split("="), nth(1), split(";"));

r.use(async (req, res, next) => {
  //handle incoming file uploads
  let ct = req.headers.get("content-type");
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
  let msg = req.body;
  logger.debug(`/message: ${JSON.stringify(msg)}`);
  if (msg.content) {
    const path = `/messages/${now.getDate()}/${now.getTime()}.msg${
      msg.deleteAfter ? "!" : ""
    }`;
    logger.info(`Adding message '${msg.content}' to replica`);
    msg.deleteAfter ? logger.info(`Deleting at ${msg.deleteAfter}`) : {};

    replica.set(author, {
      content: msg.content,
      path,
      format: "es.4",
      deleteAfter: msg.deleteAfter
        ? new Date(msg.deleteAfter).getTime() * 1000
        : null,
    }).then((v) => {
      if (v.kind === "failure") {
        logger.error(v.err?.message.substring(0, 100));
        logger.error(v.reason.substring(0, 100));
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

function Uint8ToString(u8a: Uint8Array) {
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(
      String.fromCharCode.apply(
        null,
        u8a.slice(i, i + CHUNK_SZ) as unknown as number[],
      ),
    );
  }
  return c.join("");
}

function toUint8Array(input: string): Uint8Array {
  return new Uint8Array(
    input.split("").map(function (c) {
      return c.charCodeAt(0);
    }),
  );
}

r.post("/image", async (req, res) => {
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
  replica.set(author, {
    content: Uint8ToString((res.locals.file as FormFile).content as Uint8Array),
    path,
    format: "es.4",
    deleteAfter: temp ? new Date(temp).getTime() * 1000 : null,
  }).then((v) => {
    if (v.kind === "failure") {
      logger.error(v.err?.message.substring(0, 100));
      logger.error(v.reason.substring(0, 100));
      res.sendStatus(500).json({ error: v.err?.message, reason: v.reason });
      return;
    }
    logger.info("OK");
    res.sendStatus(202);
  });
});

r.get("/docs", async (req, res) => {
  let docs = await replica.queryDocs({
    orderBy: "localIndex ASC",
    filter: {
      contentLengthGt: 0,
    },
    historyMode: "latest",
  });

  docs = docs.filter((e) => e.content != "");

  res.send(JSON.stringify(docs));
});

r.get(/\/delete\/(.*)/, async (req, res) => {
  const path = req.params[0];
  await replica.set(author, {
    path,
    content: "",
    format: "es.4",
  });

  res.sendStatus(202);
});

export default r;
