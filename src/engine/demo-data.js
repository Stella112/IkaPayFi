export const demoVault = {
  id: "vault_lagos_freelancer_001",
  name: "Lagos Freelancer Vault",
  owner: "Amina Okafor",
  region: "Nigeria",
  passkeyBound: true,
  ikaDwallet: "ika-devnet-dwallet-demo-7Ghs...K91",
  solanaPolicyPda: "IkaFirePolicyPDA7ms...PayFi",
  period: "May 2026"
};

export const demoInflow = {
  sourceChain: "Ethereum",
  asset: "ETH",
  amountCents: 325000,
  sender: "Remote Studio DAO",
  memo: "May design sprint payout"
};

export const demoPolicy = {
  savingsBps: 2500,
  familyBps: 2000,
  billsBps: 3000,
  spendLimitCents: 90000,
  currency: "USD"
};

export const assetOptions = [
  { sourceChain: "Ethereum", asset: "ETH", amountCents: 325000 },
  { sourceChain: "Bitcoin", asset: "BTC", amountCents: 480000 },
  { sourceChain: "Solana", asset: "USDC", amountCents: 210000 },
  { sourceChain: "Base", asset: "USDC", amountCents: 150000 }
];
