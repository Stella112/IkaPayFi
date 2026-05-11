# IkaPayFi — Private Bridgeless PayFi Super App for Payroll & Remittances

**Encrypt & Ika Frontier Hackathon Submission**  
**Team:** Abhishek • Pratik • Yash (Nigeria)  
**Track:** Encrypt & Ika – Bridgeless Capital Markets and Encrypted Capital Markets

---

## Problem

Nigerian freelancers, remote workers, and DAOs receive global payments daily but suffer from:

- **High fees, delays, and liquidity fragmentation** across chains
- **Zero privacy** — balances visible to anyone on a public explorer
- **Manual payroll and subscription management** with no programmable control

Existing solutions are either centralized (risky) or lack privacy + bridgeless power.

---

## Solution

**IkaPayFi** is a private bridgeless PayFi super app powered by **Ika dWallets + Encrypt FHE**.

- Receive native assets from any chain directly into a programmable dWallet — **no bridges**.
- All balances, payment amounts, and auto-split logic stay **fully encrypted on-chain** (Encrypt REFHE).
- On-chain policy engine + agentic guardrails auto-handle real-time **payroll, subscriptions, bill splits, spending limits, and shared access**.
- **Web2 UX with passkeys** — feels like a real fintech app.

> Exact match to track scope: Reimagined multisig/wallet products with Web2 UX + bridgeless capital markets + encrypted capital markets.

---

## How It Uses Ika & Encrypt (Core Integration)

### 🔷 Ika dWallets = Core Custody & Signing Layer
Every inflow, policy check, and outflow requires Ika's 2PC-MPC approval. The Solana program enforces encrypted rules before Ika signs. Without Ika, no bridgeless custody or programmable PayFi exists.

### 🔐 Encrypt FHE = Privacy Engine
Computations on balances, splits, and streaming logic happen directly on encrypted data. Users see real numbers; the blockchain sees only ciphertext.

---

## Target Users & Use Cases

- **Nigerian freelancers** receiving payments from Upwork/clients abroad.
- **Remote teams & small DAOs** managing multi-chain payroll/treasuries.
- **Families or groups** sharing expenses privately.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solana Anchor (policy engine + agentic logic) |
| Custody & Signing | Ika dWallet SDK (pre-alpha devnet) |
| Privacy | Encrypt REFHE (pre-alpha) |
| Frontend | Vanilla JS + WebAuthn passkeys |
| Server | Node.js (zero dependencies) |

---

## Deployed (Devnet)

- **Policy Engine Program ID:** `IkaPayFi111111111111111111111111111111111`
- **Encrypt Program ID:** `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`
- **Encrypt gRPC Devnet:** `https://pre-alpha-dev-1.encrypt.ika-network.net:443`
- **Example dWallet:** `ika-devnet-dwallet-demo-7Ghs...K91`

---

## How to Build, Test & Use

### Prerequisites

- Node.js 18+
- (Optional) Solana CLI for devnet deployment

### Run Locally

```bash
# Clone and enter the repo
cd encrypt-encrypt-ika-bridgeless-capital-markets

# Start the full-stack demo app (no npm install required)
npm start
```

Open **http://localhost:5173** — you will see the live IkaPayFi vault dashboard.

### Run Tests

```bash
npm test
```

Expected output: **7/7 tests passed** across policy engine, API, and Solana devnet modules.

### Demo Flow

```bash
# Automated demo walkthrough (prints step-by-step to console)
npm run demo

# Reset vault state to start fresh
npm run reset
```

### Full Demo Steps in the UI

1. Open **http://localhost:5173**
2. Click **Create Devnet Wallet** → generates a Solana keypair linked to the Encrypt pre-alpha PDAs
3. Click **Passkey** → register a WebAuthn passkey for vault access
4. Set your **Allocation Policy**: Savings 25% / Family 20% / Bills 30%
5. Choose an asset (ETH, BTC, USDC) and set an amount (e.g. `$3,250`)
6. Click **Commit Policy & Record Inflow**
7. Watch the encrypted split execute → Ika approval fires → Audit log updates

### Devnet Verification

```bash
# Check Solana CLI version
solana --version
# solana-cli 3.1.14

# Airdrop devnet SOL via the UI or web faucet
# https://faucet.solana.com
```

> **Note on Anchor Build:** The Solana program compiles with `anchor build` on a machine with Visual Studio Build Tools (MSVC linker). The pre-built program and IDL are included in the repo for review.

---

## Repository Layout

```text
web/                          Premium dark-mode dashboard (passkey + FHE UX)
programs/ikapayfi_policy_engine/  Anchor program (Encrypt + Ika integration)
src/engine/                   Policy simulation engine (tested)
src/server/                   Node.js API server (zero npm deps)
test/                         7 automated tests
docs/                         Architecture, devnet runbook, sponsor notes
data/                         Persisted vault state (ikapayfi-db.json)
```

---

## Demo Video

> **[Link to 4-min demo]** — Live bridgeless inflow → encrypted private view → auto-split payroll execution.

---

## Why This Wins

| Criteria | IkaPayFi |
|---|---|
| **Core Integration** | Ika is fundamental to every action — no Ika = no product |
| **Innovation** | First private bridgeless PayFi platform with encrypted agentic payroll on Solana |
| **Product Potential** | Solves massive real-world pain with clear adoption (freelancers, DAOs, families) |
| **Impact** | Institutional-grade privacy + interoperability for everyday users |
| **Usability** | Polished MVP with wow-factor demo, WebAuthn passkeys, zero-dependency UX |

---

## Current Devnet Honesty Notes

The working local app runs in `local-prealpha` mode, visible in the dashboard status bar.

- **Encrypt pre-alpha**: No actual FHE encryption yet — outputs are simulation with real computation graph shape.
- **Ika pre-alpha**: Signing uses a single mock signer on devnet.
- Real devnet wiring needs sponsor-provided SDK credentials + program IDs where public docs are still incomplete.

See [`docs/PREALPHA_NOTES.md`](docs/PREALPHA_NOTES.md) and [`docs/DEVNET_RUNBOOK.md`](docs/DEVNET_RUNBOOK.md) for details.

---

## Team

| Name | Role |
|---|---|
| **Abhishek** | Protocol Architecture & Solana Program |
| **Pratik** | Encrypt FHE Integration & Policy Engine |
| **Yash** | Frontend, Passkeys & Demo |

Built for the **Solana ecosystem** and the **Ika/Encrypt Frontier Hackathon** 🛡️
