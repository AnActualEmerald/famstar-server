import { opine, Logger, parse, RPC, json, ensureFile} from "./deps.ts";
import { Earthstar } from "./deps.ts";
import router from "./routes.ts";
const Shares = {
  famShare: Deno.env.get("SHARE") as string
};

ensureFile('./keypair.json');
let author: Earthstar.AuthorKeypair = {
  address: "?",
  secret: "?"
};
try {
  author = JSON.parse(new TextDecoder().decode(await Deno.readFile('./keypair.json')));
  if (!author.address || !author.secret) {
    author = await Earthstar.Crypto.generateAuthorKeypair('deno') as Earthstar.AuthorKeypair;
    await Deno.writeTextFile('./keypair.json', JSON.stringify(author));
  }
} catch (_e) {
  author = await Earthstar.Crypto.generateAuthorKeypair('deno') as Earthstar.AuthorKeypair;
  await Deno.writeTextFile('./keypair.json', JSON.stringify(author));
}

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
//this should be saved somewhere when pushed to heroku
// const author = await Earthstar.Crypto.generateAuthorKeypair('deno') as Earthstar.AuthorKeypair;
peer.addReplica(replica);
export { replica, author };
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
app.use(router);
app.use(json());


//start the server
app.listen(port, () => {
  logger.info(`Server started at http://localhost:${port}`);
});

s.transport.connections.onAdd((conn) => {
  logger.info(`Connected to peer: ${conn.description}`);
})

// const img = await replica.queryDocs({
//   filter: {
//     pathEndsWith: ".img"
//   },
// });

//decode the images 
// img.forEach(async (i, ind) => {
//   let raw = i.content.split('').map(function (c) { return c.charCodeAt(0); });
//   Deno.writeFileSync(`test${ind}.png`, new Uint8Array(raw));
// });

//test earthstar
// const author1 = await Earthstar.Crypto.generateAuthorKeypair("gaut") as Earthstar.AuthorKeypair;
// const author2 = await Earthstar.Crypto.generateAuthorKeypair("belc") as Earthstar.AuthorKeypair;

// const p1 = new Earthstar.Peer();
// const p2 = new Earthstar.Peer();

// const rep1 = new Earthstar.Replica(Shares.famShare, Earthstar.FormatValidatorEs4, new Earthstar.ReplicaDriverMemory(Shares.famShare));
// const rep2 = new Earthstar.Replica(Shares.famShare, Earthstar.FormatValidatorEs4, new Earthstar.ReplicaDriverMemory(Shares.famShare));

// p1.addReplica(rep1);
// p2.addReplica(rep2);

// rep1.set(author1, {
//   path: "/test1.txt",
//   format: "es.4",
//   content: "This was written by author1 in rep1"
// });

// rep2.set(author2, {
//   path: "/test2.txt",
//   format: "es.4",
//   content: "This was written by author2 in rep2"
// });

// const qf1 = new Earthstar.QueryFollower(rep1, {historyMode: "all", orderBy: "localIndex ASC"});
// const qf2 = new Earthstar.QueryFollower(rep2, {historyMode: "all", orderBy: "localIndex ASC"});

// qf1.bus.on((data) => {
//   if (data.kind === "success") {
//     console.group(`rep1 recieved:`);
//     console.log(data.doc.path);
//     console.log(data.doc.content);
//     console.groupEnd();
//   }
// });

// qf2.bus.on((data) => {
//   if (data.kind === "success") {
//     console.group(`rep2 recieved:`);
//     console.log(data.doc.path);
//     console.log(data.doc.content);
//     console.groupEnd();
//   }
// });

// await qf1.hatch();
// await qf2.hatch();

// console.log("begin syncing peers");

// rep1.set(author1, {
//   content: "IS this the real world",
//   path: "/new/file.txt",
//   format: "es.4"
// });

// p1.sync(`http://localhost:${port}/earthstar`);
// p2.sync(`http://localhost:${port}/earthstar`);

// // setInterval(() => {
// //   console.log(`${JSON.stringify(s.syncStatuses)}`);
// // }, 1000)

