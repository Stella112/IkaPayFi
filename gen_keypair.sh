#!/bin/bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

KEYFILE="/mnt/c/Users/Admin/Documents/Codex/2026-05-11/encrypt-encrypt-ika-bridgeless-capital-markets/target/deploy/ikapayfi_policy_engine-keypair.json"
mkdir -p "$(dirname "$KEYFILE")"

# Generate keypair if it doesn't exist
if [ ! -f "$KEYFILE" ]; then
  solana-keygen new --no-bip39-passphrase --outfile "$KEYFILE"
fi

PROGRAM_ID=$(solana-keygen pubkey "$KEYFILE")
echo "PROGRAM_ID=$PROGRAM_ID"
