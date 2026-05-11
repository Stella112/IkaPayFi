import { createInitialDb, writeDb } from "../src/server/store.mjs";

await writeDb(createInitialDb());
console.log("IkaPayFi local app data reset.");
