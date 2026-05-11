#!/bin/bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

cd "/mnt/c/Users/Admin/Documents/Codex/2026-05-11/encrypt-encrypt-ika-bridgeless-capital-markets"

echo "=== Setting up Solana devnet wallet ==="
mkdir -p ~/.config/solana

# Generate a devnet wallet if one doesn't exist
if [ ! -f ~/.config/solana/id.json ]; then
  solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json
fi

PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json)
echo "Wallet: $PUBKEY"

# Set to devnet
solana config set --url https://api.devnet.solana.com
echo "Network: $(solana config get | grep 'RPC URL')"

# Airdrop SOL for deployment fees
echo ""
echo "=== Airdropping 2 SOL for deployment ==="
solana airdrop 2 2>&1 || echo "Airdrop may have failed (rate limited), checking balance..."
BALANCE=$(solana balance 2>/dev/null || echo "0 SOL")
echo "Balance: $BALANCE"

# Find the built .so file
SO_FILE=$(find target -name "ikapayfi_policy_engine.so" 2>/dev/null | head -1)
KEYPAIR="target/deploy/ikapayfi_policy_engine-keypair.json"

if [ -z "$SO_FILE" ]; then
  echo "ERROR: .so file not found. Run build.sh first."
  exit 1
fi

echo ""
echo "=== Deploying to devnet ==="
echo "Program: $SO_FILE"
echo "Keypair: $KEYPAIR"

solana program deploy --program-id "$KEYPAIR" "$SO_FILE" 2>&1
echo "DEPLOY EXIT: $?"
