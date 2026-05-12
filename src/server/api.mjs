import { randomBytes } from "node:crypto";
import { readDb, updateDb } from "./store.mjs";
import { getIntegrationMode } from "./integration-mode.mjs";
import {
  createWalletRecord,
  deriveEncryptAccounts,
  getDevnetStatus,
  requestDevnetAirdrop
} from "./solana-devnet.mjs";
import { runPolicySimulation } from "../engine/policy-engine.js";

export async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const db = await readDb();
    return sendJson(res, 200, {
      vault: db.vault,
      inflows: db.inflows,
      approvals: db.approvals,
      auditLog: db.auditLog,
      devnet: publicDevnet(db.devnet),
      integration: getIntegrationMode()
    });
  }

  if (req.method === "POST" && pathname === "/api/devnet/wallet") {
    const result = await updateDb((db) => {
      if (!db.devnet.wallet) {
        db.devnet.wallet = createWalletRecord();
        db.devnet.encryptAccounts = deriveEncryptAccounts(db.devnet.wallet.publicKey);
        db.auditLog.unshift(
          auditEvent("DEVNET_WALLET_CREATED", "Local Solana devnet wallet created.")
        );
      }
      return {
        wallet: publicWallet(db.devnet.wallet),
        encryptAccounts: db.devnet.encryptAccounts
      };
    });
    return sendJson(res, 201, result);
  }

  if (req.method === "GET" && pathname === "/api/devnet/status") {
    const db = await readDb();
    const status = await getDevnetStatus(db.devnet.wallet);
    await updateDb((next) => {
      next.devnet.lastCheckedAt = status.checkedAt ?? new Date().toISOString();
      if (status.encryptAccounts) next.devnet.encryptAccounts = status.encryptAccounts;
    });
    return sendJson(res, 200, status);
  }

  if (req.method === "POST" && pathname === "/api/devnet/airdrop") {
    const body = await readJson(req);
    const result = await updateDb(async (db) => {
      if (!db.devnet.wallet) {
        db.devnet.wallet = createWalletRecord();
        db.devnet.encryptAccounts = deriveEncryptAccounts(db.devnet.wallet.publicKey);
      }
      let airdrop;
      try {
        airdrop = await requestDevnetAirdrop(db.devnet.wallet, Number(body.sol ?? 1));
      } catch (error) {
        const message = String(error.message ?? error);
        db.auditLog.unshift(
          auditEvent("DEVNET_AIRDROP_FAILED", "Solana devnet faucet did not fund the wallet.")
        );
        return {
          wallet: publicWallet(db.devnet.wallet),
          error: message.includes("429")
            ? "Solana devnet faucet rate limit reached. Use https://faucet.solana.com and paste the wallet address."
            : message
        };
      }
      db.devnet.lastAirdropSignature = airdrop.signature;
      db.auditLog.unshift(
        auditEvent("DEVNET_AIRDROP_CONFIRMED", `Devnet SOL airdrop confirmed: ${airdrop.signature}`)
      );
      return {
        wallet: publicWallet(db.devnet.wallet),
        airdrop
      };
    });
    if (result.error) return sendJson(res, 429, result);
    return sendJson(res, 201, result);
  }

  if (req.method === "POST" && pathname === "/api/passkeys/challenge") {
    const challenge = randomBytes(32).toString("base64url");
    await updateDb((db) => {
      db.challenges[challenge] = {
        id: challenge,
        at: new Date().toISOString()
      };
    });
    return sendJson(res, 201, {
      challenge,
      rpName: "IkaPayFi",
      userName: "amina@ikapayfi.local"
    });
  }

  if (req.method === "POST" && pathname === "/api/passkeys/register") {
    const body = await readJson(req);
    if (!body.challenge || !body.credentialId) {
      return sendJson(res, 400, { error: "challenge and credentialId are required" });
    }

    const result = await updateDb((db) => {
      if (!db.challenges[body.challenge]) {
        return { error: "Unknown or expired passkey challenge" };
      }
      delete db.challenges[body.challenge];
      const passkey = {
        id: body.credentialId,
        label: body.label ?? "Primary passkey",
        at: new Date().toISOString()
      };
      db.vault.passkeys = [passkey, ...db.vault.passkeys.filter((item) => item.id !== passkey.id)];
      db.auditLog.unshift(auditEvent("PASSKEY_REGISTERED", "Passkey registered for vault access."));
      return { passkey, vault: db.vault };
    });

    if (result.error) return sendJson(res, 400, result);
    return sendJson(res, 201, result);
  }

  if (req.method === "PATCH" && pathname === "/api/policy") {
    const body = await readJson(req);
    const policy = normalizePolicy(body);
    const result = await updateDb((db) => {
      db.vault.policy = policy;
      db.auditLog.unshift(auditEvent("POLICY_UPDATED", "Encrypted allocation policy updated."));
      return { vault: db.vault };
    });
    return sendJson(res, 200, result);
  }

  if (req.method === "POST" && pathname === "/api/inflows") {
    const body = await readJson(req);
    const result = await updateDb((db) => {
      const inflow = normalizeInflow(body);
      const simulation = runPolicySimulation({
        vault: db.vault,
        inflow,
        policy: db.vault.policy
      });

      const record = {
        id: randomId("inflow"),
        at: new Date().toISOString(),
        inflow,
        allocations: simulation.allocations,
        publicTrace: simulation.publicTrace,
        privateView: simulation.privateView,
        policyDecision: simulation.policyDecision,
        status: simulation.ikaApproval.canSign ? "APPROVED" : "REVIEW_REQUIRED"
      };

      db.inflows.unshift(record);
      if (simulation.ikaApproval.canSign) {
        applyAllocations(db.vault.balances, simulation.allocations);
      }

      const approval = {
        id: simulation.ikaApproval.approvalId,
        inflowId: record.id,
        at: record.at,
        canSign: simulation.ikaApproval.canSign,
        message: simulation.ikaApproval.message,
        mode: getIntegrationMode().mode
      };
      db.approvals.unshift(approval);
      db.auditLog.unshift(
        auditEvent(
          simulation.ikaApproval.canSign ? "IKA_APPROVAL_CREATED" : "IKA_APPROVAL_HELD",
          simulation.ikaApproval.message
        )
      );
      return { vault: db.vault, inflow: record, approval };
    });

    return sendJson(res, 201, result);
  }

  if (req.method === "POST" && pathname === "/api/reset") {
    const { createInitialDb, writeDb } = await import("./store.mjs");
    const db = createInitialDb();
    await writeDb(db);
    return sendJson(res, 200, {
      ...db,
      devnet: publicDevnet(db.devnet)
    });
  }

  // POST /api/inflows/:id/approve — approve a payroll and record Ika message hash
  const approveMatch = pathname.match(/^\/api\/inflows\/([^/]+)\/approve$/);
  if (req.method === "POST" && approveMatch) {
    const inflowId = approveMatch[1];
    const body = await readJson(req);
    const result = await updateDb((db) => {
      const inflow = db.inflows.find((i) => i.id === inflowId);
      if (!inflow) return { error: "Inflow not found" };
      inflow.status = "APPROVED";
      inflow.approvedAt = new Date().toISOString();
      inflow.approvedMessageHash = body.messageHash ?? null;
      applyAllocations(db.vault.balances, inflow.allocations);
      db.auditLog.unshift(auditEvent(
        "IKA_MESSAGE_APPROVED",
        `Payroll ${inflowId} approved via Ika dWallet. Hash: ${(body.messageHash ?? "").slice(0, 16)}...`
      ));
      return { inflow };
    });
    if (result.error) return sendJson(res, 404, result);
    return sendJson(res, 200, result);
  }

  return sendJson(res, 404, { error: "API route not found" });
}

export function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizePolicy(body) {
  const savingsBps = percentToBps(body.savingsPercent);
  const familyBps = percentToBps(body.familyPercent);
  const billsBps = percentToBps(body.billsPercent);
  const spendLimitCents = dollarsToCents(body.spendLimit);
  if (savingsBps + familyBps + billsBps > 10_000) {
    throw new Error("Policy split cannot exceed 100%");
  }
  return {
    savingsBps,
    familyBps,
    billsBps,
    spendLimitCents,
    currency: "USD"
  };
}

function normalizeInflow(body) {
  if (!body.sourceChain || !body.asset) {
    throw new Error("sourceChain and asset are required");
  }
  const amountCents = dollarsToCents(body.amount);
  if (amountCents <= 0) {
    throw new Error("amount must be greater than zero");
  }
  return {
    sourceChain: String(body.sourceChain),
    asset: String(body.asset),
    amountCents,
    sender: body.sender ? String(body.sender) : "External payer",
    memo: body.memo ? String(body.memo) : "Private inflow"
  };
}

function dollarsToCents(value) {
  return Math.round(Number(value) * 100);
}

function percentToBps(value) {
  return Math.round(Number(value) * 100);
}

function applyAllocations(balances, allocations) {
  for (const item of allocations) {
    balances[item.key] = (balances[item.key] ?? 0) + item.amountCents;
  }
}

function auditEvent(type, message) {
  return {
    id: randomId("evt"),
    type,
    at: new Date().toISOString(),
    message
  };
}

function randomId(prefix) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function publicWallet(record) {
  if (!record) return null;
  return {
    publicKey: record.publicKey,
    createdAt: record.createdAt,
    explorer: `https://explorer.solana.com/address/${record.publicKey}?cluster=devnet`
  };
}

function publicDevnet(devnet) {
  return {
    ...devnet,
    wallet: publicWallet(devnet?.wallet)
  };
}
