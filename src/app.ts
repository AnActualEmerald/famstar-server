import { opine, Logger, Level, RPC, json, ensureDir, serveStatic} from "./deps.ts";
import { Earthstar } from "./deps.ts";
import router from "./routes.ts";
import sql from "./db.ts";

const Shares = {
  famShare: Deno.env.get("SHARE") as string
};

await ensureDir('./data');

const getKeys = async () => {
  const kp = await (await sql`SELECT address, secret FROM secrets WHERE shortname='deno'`);
  if (kp.length > 0) {
    const r = JSON.stringify(kp[0]);
    return JSON.parse(r) as Earthstar.AuthorKeypair;
  } else {
    const k = await Earthstar.Crypto.generateAuthorKeypair('deno') as Earthstar.AuthorKeypair;
    await sql`INSERT INTO secrets (shortname, address, secret) VALUES ('deno', ${k.address}, ${k.secret})`;
    return k
  }
}

const author: Earthstar.AuthorKeypair = await getKeys();


//setup logging
// const logLevel = Deno.env.get("FAMSTAR_LOG");
const logger = new Logger().withMinLogLevel(Level.Debug);


const DEFAULT_PORT = 8800;
const envPort = Deno.env.get("PORT");
const port = envPort ? Number(envPort) : DEFAULT_PORT;


const app = opine();

//setup earthstar
const peer = new Earthstar.Peer();
const replica = new Earthstar.Replica(Shares.famShare, Earthstar.FormatValidatorEs4, new Earthstar.ReplicaDriverSqlite({
  mode: "create-or-open",
  share: Shares.famShare,
  filename: "./data/fam.share"
}));
peer.addReplica(replica);
export { replica, author, logger};
const s = new Earthstar.Syncer(
  peer,
  (methods) =>
    new RPC.TransportHttpServerOpine({
      deviceId: peer.peerId,
      methods,
      app,
      path: "/earthstar/"
    }),
);

app.use(json());
app.use("/", serveStatic("public"));
app.use("/api", router);



//start the server
app.listen(port, () => {
  logger.info(`Server started at http://localhost:${port}`);
});

s.transport.connections.onAdd((conn) => {
  logger.info(`Connected to peer: ${conn.description}`);
})