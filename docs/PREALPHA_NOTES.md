# Pre-Alpha Integration Notes

These notes are based on the public docs as of May 11, 2026.

## Encrypt

Public docs: https://docs.encrypt.xyz/

Key implementation notes:

- Encrypt supports Solana programs through `encrypt-anchor`, `encrypt-pinocchio`, and `encrypt-native`.
- The `#[encrypt_fn]` macro compiles Rust-like FHE functions into computation graphs.
- Graph execution creates output ciphertext accounts on-chain.
- The hosted pre-alpha executor is listed at `https://pre-alpha-dev-1.encrypt.ika-network.net:443`.
- The docs list the Encrypt Solana devnet program ID as `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`.
- The docs warn that pre-alpha currently stores plaintext/mock data and must not be used for sensitive real data.

## Ika

Public docs: https://solana-pre-alpha.ika.xyz/

Key implementation notes:

- dWallets let Solana programs control signing keys for other blockchains.
- The intended flow is: create dWallet, transfer authority to program CPI authority PDA, approve messages when conditions are met, and let Ika produce signatures.
- The docs warn that the Solana pre-alpha currently uses a single mock signer rather than full distributed MPC.

## MVP Strategy

For the hackathon repo:

1. Keep a deterministic local demo so judges can understand the product instantly.
2. Include the real Solana/Encrypt/Ika integration skeleton.
3. Fill real program IDs, dWallet links, and transactions after devnet deployment.
