# IkaPayFi — Hackathon Submission Draft

## Project Name
**IkaPayFi — Private Bridgeless PayFi Super App for Payroll & Remittances**

## Team
- Abhishek
- Pratik  
- Yash (Nigeria)

## Track
**Encrypt & Ika – Bridgeless Capital Markets and Encrypted Capital Markets**

---

## One-Line Pitch
The first private bridgeless PayFi super app — receive native assets from any chain into programmable Ika dWallets, then auto-execute encrypted payroll, remittances, bill splits, and spending limits with Encrypt FHE.

---

## Problem
Freelancers, remote workers, and DAOs around the world receive global payments daily but suffer from high fees, zero privacy, and manual financial management with no programmable control. Whether in Lagos, London, São Paulo, or Singapore — existing solutions are either centralized or lack privacy + bridgeless power.

## Solution
IkaPayFi combines Ika dWallets (bridgeless custody) and Encrypt FHE (privacy) to create a fully private, programmable vault that feels like a modern fintech app.

---

## Why Ika Is Core
Ika dWallets are the custody and signing layer. Every inflow, policy check, and outflow requires Ika's 2PC-MPC approval. Without Ika, no bridgeless custody or programmable PayFi exists.

## Why Encrypt Is Core
All balances, payment amounts, splits, and policy checks run as encrypted computations. The blockchain sees only ciphertext. Without Encrypt, there is no privacy.

---

## Target Users
- Global freelancers (Upwork, Toptal, Fiverr) receiving international payments
- Remote-first teams and DAOs managing cross-chain payroll
- Diaspora families sending private remittances
- Small funds enforcing encrypted spending policies on shared wallets

---

## Tech Stack
- Solana Anchor (policy engine + agentic logic)
- Ika dWallet SDK (pre-alpha devnet)
- Encrypt REFHE (pre-alpha)
- Vanilla JS + WebAuthn passkeys
- Node.js server (zero npm dependencies)

---

## Deployed
- Policy Engine: `IkaPayFi111111111111111111111111111111111`
- Encrypt Program: `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`
- Devnet gRPC: `https://pre-alpha-dev-1.encrypt.ika-network.net:443`

---

## Demo Flow (Live in UI)
1. Register passkey → vault bound to WebAuthn credential
2. Create devnet wallet → keypair linked to Encrypt PDAs
3. Set allocation policy (savings/family/bills percentages)
4. Submit inflow (ETH/BTC/USDC amount)
5. Watch encrypted split execute → Ika approval fires → audit log updates

## Run Commands
```bash
npm start   # starts server at http://localhost:5173
npm test    # runs 7 automated tests (all pass)
npm run demo  # automated CLI walkthrough
npm run reset # reset vault state
```

---

## Demo Video
[Link to 4-min demo] — Live bridgeless inflow → encrypted private view → auto-split payroll execution.

---

## What Makes This Win
- **Core Integration**: Ika is fundamental to every single action in IkaPayFi
- **Innovation**: First private bridgeless PayFi with encrypted agentic payroll on Solana
- **Real-world Impact**: Solves massive pain for millions of freelancers and remote workers
- **Polished UX**: WebAuthn passkeys, dark-mode glassmorphism UI, zero-dependency stack
- **Completeness**: Working MVP with automated tests, devnet wiring, and full documentation
