# Devnet Runbook

## What Works Now

The local app can:

- create a Solana devnet wallet
- persist the wallet server-side in `data/ikapayfi-db.json`
- derive Encrypt pre-alpha PDAs from the official example repo seeds
- check whether the Encrypt config account exists on devnet
- request devnet SOL from the Solana faucet when the faucet is available
- record inflows, policy results, approvals, balances, and audit events

The current devnet wallet endpoint does not expose the secret key to the browser.

## Commands

```bash
npm install
npm test
npm start
```

Open:

```text
http://localhost:5173
```

Useful API calls:

```bash
curl -X POST http://localhost:5173/api/devnet/wallet
curl http://localhost:5173/api/devnet/status
curl -X POST http://localhost:5173/api/devnet/airdrop -H "content-type: application/json" -d "{\"sol\":1}"
```

If the Solana faucet returns `429`, fund the wallet manually at:

```text
https://faucet.solana.com
```

## Encrypt Integration Shape

The official Encrypt pre-alpha repo uses:

- `encrypt-anchor::EncryptContext`
- `encrypt_dsl::prelude::encrypt_fn`
- `encrypt_types::encrypted::{EUint64, EBool}`
- CPI accounts for config, deposit, CPI authority, caller program, network encryption key, payer, event authority, and system program

IkaPayFi mirrors that pattern in:

```text
programs/ikapayfi_policy_engine/src/lib.rs
programs/ikapayfi_policy_engine/src/encrypted_policy.rs
```

## Toolchain Status On This Machine

Current status:

- Rust/Cargo installed through rustup.
- Solana/Agave CLI extracted to `C:\tmp\solana-release\solana-release\bin`.
- Solana CLI verified: `solana-cli 3.1.14`.
- Anchor CLI install attempted with `cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli --locked`.
- Anchor CLI install failed because Windows is missing the MSVC linker `link.exe`.

Required unblock:

- Install Visual Studio Build Tools with the Visual C++ workload, or use a Linux/WSL machine with Rust, Solana CLI, and Anchor installed.

Until that linker exists, the Anchor program cannot be built or deployed from this machine.

## Deploy Steps Once Toolchain Exists

```bash
solana config set --url devnet
solana-keygen new --outfile .keys/deployer.json
solana airdrop 2 .keys/deployer.json --url devnet
anchor build
anchor deploy --provider.cluster devnet --provider.wallet .keys/deployer.json
```

Then set:

```text
IKAPAYFI_PROGRAM_ID=<deployed program id>
```
