import {
  ensureDir,
  json,
  Level,
  Logger,
  opine,
  RPC,
  serveStatic,
} from "./deps.ts";
import { Earthstar } from "./deps.ts";
import { type AuthorKeypair, type ShareKeypair, Replica } from "https://deno.land/x/earthstar@v10.2.1/mod.ts";
import router from "./routes.ts";
// import sql from "./db.ts";


await ensureDir("./data");

const settings = new Earthstar.SharedSettings();

if (!settings.author) {
  const authorKp = await Earthstar.Crypto.generateAuthorKeypair("deno");
  settings.author = authorKp as AuthorKeypair;
}

if (settings.shares.length) {
  const shareKp = await Earthstar.Crypto.generateShareKeypair("fam");
  if (!Earthstar.isErr(shareKp)) {
    settings.addShare(shareKp.shareAddress);
    settings.addSecret(shareKp.shareAddress, shareKp.secret);
    await Deno.writeTextFile('./data/known_shares.json', JSON.stringify(settings.shares));
  }
}

export const author = settings.author;
export const replica = new Replica({
  driver: {
    docDriver: new DocDriverMemory
  }
});

//setup logging
// const logLevel = Deno.env.get("FAMSTAR_LOG");
export const logger = new Logger().withMinLogLevel(Level.Debug);

const DEFAULT_PORT = 8800;
const envPort = Deno.env.get("PORT");
const port = envPort ? Number(envPort) : DEFAULT_PORT;

const app = opine();

//setup earthstar
const server = new Earthstar.Server([
  new Earthstar.ExtensionKnownShares({
    knownSharesPath: './data/known_shares.json',
    onCreateReplica: (addr) => {
      return new Earthstar.Replica({
        driver: {
          docDriver: new Earthstar.DocDriverSqlite({
            share: addr,
            filename: `./data/${addr}_data.sql`,
            mode: "create-or-open",
          }),
          attachmentDriver: new Earthstar.AttachmentDriverFilesystem(
            `./data/${addr}_attachments`,
          ),
        },
      });
    },
  }),
  new Earthstar.ExtensionSyncWeb({
    path: "/earthstar",
  }),
], {
  port
});


// const peer = new Earthstar.Peer();
// const replica = new Earthstar.Replica({
//   driver: new Earthstar.ReplicaDriverFs(Shares.famShare, "./data/fam.share"),
// });
// peer.addReplica(replica);
// export { replica, author, logger};
// const s = new Earthstar.Syncer(
//   peer,
//   (methods) =>
//     new RPC.TransportHttpServerOpine({
//       deviceId: peer.peerId,
//       methods,
//       app,
//       path: "/earthstar/"
//     }),
// );

app.use(json());
app.use("/", serveStatic("public"));
app.use("/api", router);

//start the server
app.listen(port, () => {
  logger.info(`Server started at http://localhost:${port}`);
});

// s.transport.connections.onAdd((conn) => {
//   logger.info(`Connected to peer: ${conn.description}`);
// })
