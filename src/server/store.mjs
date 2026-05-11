import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { demoPolicy, demoVault } from "../engine/demo-data.js";

const dbPath = process.env.IKAPAYFI_DB_PATH ?? join(process.cwd(), "data", "ikapayfi-db.json");

export async function readDb() {
  try {
    return normalizeDb(JSON.parse(await readFile(dbPath, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const initial = createInitialDb();
    await writeDb(initial);
    return initial;
  }
}

export async function writeDb(db) {
  await mkdir(dirname(dbPath), { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

export async function updateDb(mutator) {
  const db = await readDb();
  const result = await mutator(db);
  db.updatedAt = new Date().toISOString();
  await writeDb(db);
  return result ?? db;
}

export function createInitialDb() {
  const now = new Date().toISOString();
  return {
    version: 1,
    mode: "local-prealpha",
    createdAt: now,
    updatedAt: now,
    vault: {
      ...demoVault,
      policy: demoPolicy,
      balances: {
        savings: 0,
        family: 0,
        bills: 0,
        spendable: 0
      },
      passkeys: [],
      status: "ACTIVE"
    },
    devnet: {
      wallet: null,
      encryptAccounts: null,
      lastAirdropSignature: null,
      lastCheckedAt: null
    },
    inflows: [],
    approvals: [],
    auditLog: [
      {
        id: "evt_bootstrap",
        type: "VAULT_BOOTSTRAPPED",
        at: now,
        message: "IkaPayFi vault initialized in local pre-alpha mode."
      }
    ],
    challenges: {}
  };
}

function normalizeDb(db) {
  const fresh = createInitialDb();
  return {
    ...fresh,
    ...db,
    vault: {
      ...fresh.vault,
      ...db.vault,
      balances: {
        ...fresh.vault.balances,
        ...(db.vault?.balances ?? {})
      },
      passkeys: db.vault?.passkeys ?? fresh.vault.passkeys
    },
    devnet: {
      ...fresh.devnet,
      ...(db.devnet ?? {})
    },
    inflows: db.inflows ?? fresh.inflows,
    approvals: db.approvals ?? fresh.approvals,
    auditLog: db.auditLog ?? fresh.auditLog,
    challenges: db.challenges ?? fresh.challenges
  };
}
