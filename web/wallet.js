/**
 * wallet.js — Solana wallet adapter (vanilla JS, no bundler needed)
 * Supports Phantom, Solflare, Backpack, and any window.solana-compatible wallet.
 */

// ── Wallet Registry ─────────────────────────────────────────────────────────

export const WALLETS = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "https://phantom.app/favicon.ico",
    get provider() {
      return window?.phantom?.solana ?? (window?.solana?.isPhantom ? window.solana : null);
    }
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "https://solflare.com/favicon.ico",
    get provider() {
      return window?.solflare?.isSolflare ? window.solflare : null;
    }
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "https://backpack.app/favicon.ico",
    get provider() {
      return window?.backpack?.solana ?? (window?.xnft?.solana ?? null);
    }
  }
];

// ── State ────────────────────────────────────────────────────────────────────

let _connected = null; // { wallet, provider, publicKey }
const _listeners = new Set();

export function getWalletState() {
  return _connected;
}

export function isConnected() {
  return _connected !== null;
}

export function getPublicKey() {
  return _connected?.publicKey ?? null;
}

export function onWalletChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _emit() {
  for (const fn of _listeners) fn(_connected);
}

// ── Connect / Disconnect ─────────────────────────────────────────────────────

export async function connectWallet(walletId) {
  const wallet = WALLETS.find((w) => w.id === walletId);
  if (!wallet) throw new Error(`Unknown wallet: ${walletId}`);

  const provider = wallet.provider;
  if (!provider) {
    // Open install page
    const installUrls = {
      phantom: "https://phantom.app",
      solflare: "https://solflare.com",
      backpack: "https://backpack.app"
    };
    window.open(installUrls[walletId], "_blank");
    throw new Error(`${wallet.name} is not installed. Opening install page...`);
  }

  try {
    const response = await provider.connect();
    const publicKey = response?.publicKey?.toString() ?? provider.publicKey?.toString();
    if (!publicKey) throw new Error("Wallet connected but no public key returned.");

    _connected = { wallet, provider, publicKey };

    // Listen for disconnect
    provider.on?.("disconnect", () => {
      if (_connected?.wallet.id === walletId) {
        _connected = null;
        _emit();
      }
    });

    // Listen for account change
    provider.on?.("accountChanged", (newPubkey) => {
      if (_connected?.wallet.id === walletId && newPubkey) {
        _connected = { ..._connected, publicKey: newPubkey.toString() };
        _emit();
      }
    });

    _emit();
    return _connected;
  } catch (err) {
    if (err.code === 4001) throw new Error("Connection rejected by user.");
    throw err;
  }
}

export async function disconnectWallet() {
  if (!_connected) return;
  try {
    await _connected.provider.disconnect?.();
  } catch {
    // Ignore disconnect errors
  }
  _connected = null;
  _emit();
}

// ── Sign Message (for policy approvals) ─────────────────────────────────────

export async function signApproval(messageHash) {
  if (!_connected) throw new Error("No wallet connected");

  const message = `IkaPayFi Policy Approval\nMessage hash: ${messageHash}\nApprove this dWallet signing request?`;
  const encodedMessage = new TextEncoder().encode(message);

  const { signature } = await _connected.provider.signMessage(encodedMessage, "utf8");
  return {
    signature: Buffer.from(signature).toString("hex"),
    publicKey: _connected.publicKey,
    message
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatAddress(publicKey) {
  if (!publicKey) return "";
  return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
}

export function getAvailableWallets() {
  return WALLETS.filter((w) => w.provider !== null);
}

export function getInstallableWallets() {
  return WALLETS.filter((w) => w.provider === null);
}
