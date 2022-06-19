import { postgres } from "./deps.ts";

const dbUrl = Deno.env.get("DATABASE_URL");

if (!dbUrl) {
  console.error("DATABASE_URL not set");
  Deno.exit(-1);
}

const sql = postgres(dbUrl, { ssl: "prefer" });

export default sql;
