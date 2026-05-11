#!/bin/bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source "$HOME/.cargo/env" 2>/dev/null || true

echo "=== Tool Versions ==="
echo "Rust:   $(rustc --version)"
echo "Solana: $(solana --version)"
echo "Anchor: $(anchor --version)"

echo ""
echo "=== Running anchor build (skip IDL build to avoid Rust version conflict) ==="
cd "/mnt/c/Users/Admin/Documents/Codex/2026-05-11/encrypt-encrypt-ika-bridgeless-capital-markets"

# Use RUSTUP_TOOLCHAIN to force the solana-pinned toolchain which anchor needs for IDL
# The solana toolchain is installed at: 1.79.0-x86_64-unknown-linux-gnu
# We run cargo build-bpf directly on the program to get the .so without the IDL step
SOLANA_TOOLCHAIN=$(rustup toolchain list | grep "solana" | head -1 | awk '{print $1}')
echo "Solana toolchain: $SOLANA_TOOLCHAIN"

if [ -n "$SOLANA_TOOLCHAIN" ]; then
  cd programs/ikapayfi_policy_engine
  RUSTUP_TOOLCHAIN="$SOLANA_TOOLCHAIN" cargo build-sbf 2>&1
else
  anchor build --no-idl 2>&1 || anchor build 2>&1
fi

EXIT=$?
echo ""
echo "BUILD EXIT: $EXIT"

if [ $EXIT -eq 0 ]; then
  echo ""
  echo "=== Build Artifacts ==="
  find /mnt/c/Users/Admin/Documents/Codex/2026-05-11/encrypt-encrypt-ika-bridgeless-capital-markets/target -name "*.so" 2>/dev/null | head -5 || echo "No .so files found"
fi
