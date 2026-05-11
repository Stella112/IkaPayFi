#!/bin/bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

WALLET=$(solana-keygen pubkey ~/.config/solana/id.json)
echo "Wallet: $WALLET"

# Try multiple faucets
echo "=== Trying devnet faucet ==="
curl -s "https://faucet.devnet.solana.com" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"pubkey\":\"$WALLET\",\"lamports\":2000000000}" 2>&1 | head -3

echo ""
echo "Waiting 5s..."
sleep 5

BALANCE=$(solana balance --url https://api.devnet.solana.com "$WALLET" 2>/dev/null || echo "error")
echo "Balance: $BALANCE"
