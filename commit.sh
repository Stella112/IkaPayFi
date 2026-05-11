#!/bin/bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

cd "/mnt/c/Users/Admin/Documents/Codex/2026-05-11/encrypt-encrypt-ika-bridgeless-capital-markets"

# Add all changed files (excluding target/ build artifacts)
git add programs/ikapayfi_policy_engine/src/lib.rs
git add programs/ikapayfi_policy_engine/src/encrypted_policy.rs
git add programs/ikapayfi_policy_engine/src/encrypt_stub.rs
git add programs/ikapayfi_policy_engine/Cargo.toml
git add Anchor.toml
git add build.sh deploy.sh airdrop.sh gen_keypair.sh
# Add the deploy keypair JSON but NOT the wallet keypair
git add target/deploy/ikapayfi_policy_engine-keypair.json 2>/dev/null || true

git commit -m "build: anchor build succeeds - valid program ID, encrypt stub, idl-build feature"
git push

echo "PUSH EXIT: $?"
echo "Repo: https://github.com/Stella112/IkaPayFi"
