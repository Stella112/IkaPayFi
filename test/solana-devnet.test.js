import test from "node:test";
import assert from "node:assert/strict";
import { createWalletRecord, deriveEncryptAccounts } from "../src/server/solana-devnet.mjs";

test("creates a local devnet wallet record", () => {
  const wallet = createWalletRecord();

  assert.equal(typeof wallet.publicKey, "string");
  assert.equal(wallet.secretKey.length, 64);
});

test("derives Encrypt pre-alpha Solana accounts from official seeds", () => {
  const wallet = createWalletRecord();
  const accounts = deriveEncryptAccounts(wallet.publicKey);

  assert.equal(accounts.encryptProgram, "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8");
  assert.equal(typeof accounts.configPda, "string");
  assert.equal(typeof accounts.depositPda, "string");
  assert.equal(accounts.networkKeyHex, "55".repeat(32));
});
