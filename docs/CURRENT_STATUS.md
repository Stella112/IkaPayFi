# Current Status

## Working

- Stateful IkaPayFi web app at `http://localhost:5173`
- Persistent local database in `data/ikapayfi-db.json`
- Backend API under `/api/*`
- Policy engine with tests
- Inflow recording and approval records
- Audit trail
- Passkey registration record flow
- Solana devnet wallet generation
- Encrypt pre-alpha PDA derivation from official repo seeds
- Devnet status check confirms the Encrypt config account exists
- Official Encrypt pre-alpha repo cloned to `C:\tmp\encrypt-pre-alpha` for reference
- On-chain Anchor scaffold updated to use official `encrypt-anchor` / `EncryptContext` pattern

## Verified

```text
npm test
7/7 tests passed
```

```text
solana --version
solana-cli 3.1.14
```

## Blocked

Anchor CLI cannot install on this Windows machine because the MSVC linker is missing:

```text
error: linker `link.exe` not found
```

Install Visual Studio Build Tools with Visual C++ or move deployment to a machine with a complete Solana/Anchor toolchain.

## Devnet Faucet

The app can request devnet SOL, but the public faucet returned `429 Too Many Requests` during verification. Use the web faucet if needed:

```text
https://faucet.solana.com
```
