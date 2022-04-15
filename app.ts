import { opine, Logger, parse, RPC } from "./deps.ts";
import { Earthstar } from "./deps.ts";
import Shares from "./shares.json" assert{type: "json"}

//setup logging
const logger = new Logger();

const { args } = Deno;
const DEFAULT_PORT = 8800;
const argPort = parse(args).port;
const port = argPort ? Number(argPort) : DEFAULT_PORT;


const app = opine();

//setup earthstar
const peer = new Earthstar.Peer();
const replica = new Earthstar.Replica(Shares.famShare, Earthstar.FormatValidatorEs4, new Earthstar.ReplicaDriverSqlite({
  mode: "create-or-open",
  share: Shares.famShare,
  filename: "./data/fam.share"
}));

peer.addReplica(replica);


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

// // app.file("/", "./public/index.html");s
// app.get("/ws", (req, res) => {
  
// });



//start the server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});

s.transport.connections.onAdd((conn) => {
  console.log(conn.description);
})

//test earthstar
const author1 = await Earthstar.Crypto.generateAuthorKeypair("gaut") as Earthstar.AuthorKeypair;
const author2 = await Earthstar.Crypto.generateAuthorKeypair("belc") as Earthstar.AuthorKeypair;

const p1 = new Earthstar.Peer();
const p2 = new Earthstar.Peer();

const rep1 = new Earthstar.Replica(Shares.famShare, Earthstar.FormatValidatorEs4, new Earthstar.ReplicaDriverMemory(Shares.famShare));
const rep2 = new Earthstar.Replica(Shares.famShare, Earthstar.FormatValidatorEs4, new Earthstar.ReplicaDriverMemory(Shares.famShare));

p1.addReplica(rep1);
p2.addReplica(rep2);

rep1.set(author1, {
  path: "/test1.txt",
  format: "es.4",
  content: "This was written by author1 in rep1"
});

rep2.set(author2, {
  path: "/test2.txt",
  format: "es.4",
  content: "This was written by author2 in rep2"
});

const qf1 = new Earthstar.QueryFollower(rep1, {historyMode: "all", orderBy: "localIndex ASC"});
const qf2 = new Earthstar.QueryFollower(rep2, {historyMode: "all", orderBy: "localIndex ASC"});

qf1.bus.on((data) => {
  if (data.kind === "success") {
    console.group(`rep1 recieved:`);
    console.log(data.doc.path);
    console.log(data.doc.content);
    console.groupEnd();
  }
});

qf2.bus.on((data) => {
  if (data.kind === "success") {
    console.group(`rep2 recieved:`);
    console.log(data.doc.path);
    console.log(data.doc.content);
    console.groupEnd();
  }
});

await qf1.hatch();
await qf2.hatch();

console.log("begin syncing peers");

rep1.set(author1, {
  content: "IS this the real world",
  path: "/new/file.txt",
  format: "es.4"
});

p1.sync(`http://localhost:${port}/earthstar`);
p2.sync(`http://localhost:${port}/earthstar`);

// setInterval(() => {
//   console.log(`${JSON.stringify(s.syncStatuses)}`);
// }, 1000)

