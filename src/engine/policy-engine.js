const BUCKETS = [
  ["savings", "Savings"],
  ["family", "Family"],
  ["bills", "Bills"],
  ["spendable", "Spendable"]
];

export function runPolicySimulation({ vault, inflow, policy }) {
  validatePolicy(policy);

  const split = calculateSplit(inflow.amountCents, policy);
  const allocations = BUCKETS.map(([key, label]) => ({
    key,
    label,
    amountCents: split[key],
    privateFormatted: formatMoney(split[key], policy.currency),
    ciphertextId: ciphertextId(vault.id, inflow.asset, key, split[key])
  }));

  const spendable = allocations.find((item) => item.key === "spendable");
  const approved = spendable.amountCents <= policy.spendLimitCents;

  return {
    vaultName: vault.name,
    vault,
    inflow,
    policy,
    privateView: {
      formattedInflow: formatMoney(inflow.amountCents, policy.currency),
      totalAfterSplit: formatMoney(sum(allocations), policy.currency)
    },
    allocations,
    policyDecision: {
      status: approved ? "PASS" : "HOLD_FOR_REVIEW",
      reason: approved
        ? "Encrypted spendable bucket is within the private period limit."
        : "Encrypted spendable bucket exceeds the private period limit.",
      encryptedLimit: ciphertextId(vault.id, "limit", "period", policy.spendLimitCents)
    },
    ikaApproval: {
      approvalId: approvalId(vault.id, inflow, approved),
      canSign: approved,
      message: approved
        ? "IkaFire can approve the dWallet payout message."
        : "IkaFire withholds dWallet approval until a signer reviews the policy."
    },
    publicTrace: buildPublicTrace(vault, inflow, allocations, approved)
  };
}

export function calculateSplit(amountCents, policy) {
  const savings = Math.floor((amountCents * policy.savingsBps) / 10_000);
  const family = Math.floor((amountCents * policy.familyBps) / 10_000);
  const bills = Math.floor((amountCents * policy.billsBps) / 10_000);
  const spendable = amountCents - savings - family - bills;

  return { savings, family, bills, spendable };
}

export function validatePolicy(policy) {
  const total = policy.savingsBps + policy.familyBps + policy.billsBps;
  if (total > 10_000) {
    throw new Error("Policy split cannot exceed 100%");
  }
  if (policy.spendLimitCents < 0) {
    throw new Error("Spend limit cannot be negative");
  }
}

export function formatMoney(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

export function ciphertextId(...parts) {
  const digest = stableHash(parts.join(":"));
  return `ct_${digest.slice(0, 12)}...${digest.slice(-6)}`;
}

function approvalId(vaultId, inflow, approved) {
  const digest = stableHash(
    `${vaultId}:${inflow.sourceChain}:${inflow.asset}:${inflow.amountCents}:${approved}`
  );
  return `ika_msg_${digest.slice(0, 10)}`;
}

function stableHash(input) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let index = 0; index < input.length; index += 1) {
    a ^= input.charCodeAt(index);
    a = Math.imul(a, 0x01000193) >>> 0;
    b ^= a + index;
    b = Math.imul(b, 0x85ebca6b) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}${(a ^ b)
    .toString(16)
    .padStart(8, "0")}`;
}

function buildPublicTrace(vault, inflow, allocations, approved) {
  return [
    {
      label: "Vault policy PDA",
      value: vault.solanaPolicyPda
    },
    {
      label: "Ika dWallet",
      value: vault.ikaDwallet
    },
    {
      label: "Graph",
      value: `encrypted_split_${inflow.asset.toLowerCase()}`
    },
    {
      label: "Outputs",
      value: allocations.map((item) => item.ciphertextId).join("  ")
    },
    {
      label: "Approval",
      value: approved ? "policy_passed" : "manual_review_required"
    }
  ];
}

function sum(allocations) {
  return allocations.reduce((total, item) => total + item.amountCents, 0);
}
