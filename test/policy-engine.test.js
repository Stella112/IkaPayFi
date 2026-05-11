import test from "node:test";
import assert from "node:assert/strict";
import { demoInflow, demoPolicy, demoVault } from "../src/engine/demo-data.js";
import { calculateSplit, runPolicySimulation } from "../src/engine/policy-engine.js";

test("splits inflow into savings, family, bills, and spendable buckets", () => {
  const split = calculateSplit(100_00, {
    savingsBps: 2500,
    familyBps: 2000,
    billsBps: 3000,
    spendLimitCents: 9000
  });

  assert.deepEqual(split, {
    savings: 2500,
    family: 2000,
    bills: 3000,
    spendable: 2500
  });
});

test("passes Ika approval when encrypted spendable bucket is within limit", () => {
  const result = runPolicySimulation({
    vault: demoVault,
    inflow: demoInflow,
    policy: demoPolicy
  });

  assert.equal(result.policyDecision.status, "PASS");
  assert.equal(result.ikaApproval.canSign, true);
  assert.equal(result.allocations.length, 4);
});

test("holds approval when spendable bucket exceeds private limit", () => {
  const result = runPolicySimulation({
    vault: demoVault,
    inflow: { ...demoInflow, amountCents: 900_000 },
    policy: { ...demoPolicy, spendLimitCents: 10_000 }
  });

  assert.equal(result.policyDecision.status, "HOLD_FOR_REVIEW");
  assert.equal(result.ikaApproval.canSign, false);
});

test("rejects split policies above 100 percent", () => {
  assert.throws(() =>
    runPolicySimulation({
      vault: demoVault,
      inflow: demoInflow,
      policy: {
        ...demoPolicy,
        savingsBps: 6000,
        familyBps: 3000,
        billsBps: 2000
      }
    })
  );
});
