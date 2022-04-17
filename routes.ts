import { Router, ImageScript, MultipartReader } from "./deps.ts";
import { author, replica} from "./app.ts";
const key = Deno.env.get("KEY") as string;

import * as R from "https://cdn.skypack.dev/ramda@^0.27.1";
import { FormFile } from "https://deno.land/std@0.134.0/mime/mod.ts";

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
const getBoundary = compose(nth(1), split('='), nth(1), split(';'));

r.use(async (req, res, next) => {

  //handle incoming file uploads
  let ct = req.headers.get('content-type');
  if (ct?.startsWith('multipart/form-data')) {

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
  console.log(msg);
  if (msg.content) {
    const path = `/messages/${now.getDate()}/${now.getTime()}.msg${
      msg.deleteAfter ? "!" : ""
    }`;
    replica.set(author, {
      content: msg.content,
      path,
      format: "es.4",
      deleteAfter: msg.deleteAfter ? Date.now() * 1000 + msg.deleteAfter : null,
    }).then((v) => {
      res.sendStatus(202);
    }).catch((r) => {
      res.sendStatus(500);
    });
  } else {
    res.sendStatus(400);
  }
});

function Uint8ToString(u8a: Uint8Array){
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.slice(i, i+CHUNK_SZ) as unknown as number[]));
  }
  return c.join("");
}

r.post("/image", async (req, res) => {
  const now = new Date(Date.now());
  // if (res.locals) {
  const temp = req.headers.get("Delete-After");
  const path = `/images/${now.getDate()}/${now.getTime()}.img${temp ? "!" : ""
    }`;
    
    replica.set(author, {
      content: Uint8ToString((res.locals.file as FormFile).content as Uint8Array),
      path,
      format: "es.4",
      deleteAfter: temp ? Number(temp) : null,
    }).then((v) => {
      if (v.kind === "failure") {
        console.log(v.err?.message.substring(0, 100));
        console.log(v.reason.substring(0, 100));
        res.sendStatus(500);
      }
      res.sendStatus(202);
    });
  // } else {
  //   res.sendStatus(400);
  // }
  // console.log(res.locals);
  // res.sendStatus(500);
});

export default r;
