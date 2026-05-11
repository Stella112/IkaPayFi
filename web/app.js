import { assetOptions } from "../src/engine/demo-data.js";
import {
  WALLETS,
  connectWallet,
  disconnectWallet,
  onWalletChange,
  getPublicKey,
  isConnected,
  formatAddress,
  getAvailableWallets,
  getInstallableWallets
} from "./wallet.js";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form = document.querySelector("#policyForm");
const assetSelect = document.querySelector("#assetSelect");
const amountInput = document.querySelector("#amountInput");
const senderInput = document.querySelector("#senderInput");
const savingsInput = document.querySelector("#savingsInput");
const familyInput = document.querySelector("#familyInput");
const billsInput = document.querySelector("#billsInput");
const limitInput = document.querySelector("#limitInput");
const passkeyButton = document.querySelector("#passkeyButton");
const resetButton = document.querySelector("#resetButton");
const walletButton = document.querySelector("#walletButton");
const airdropButton = document.querySelector("#airdropButton");
const statusButton = document.querySelector("#statusButton");

const labels = {
  savings: document.querySelector("#savingsLabel"),
  family: document.querySelector("#familyLabel"),
  bills: document.querySelector("#billsLabel")
};

// Wallet UI elements
const connectWalletBtn = document.querySelector("#connectWalletBtn");
const gateConnectBtn = document.querySelector("#gateConnectBtn");
const walletDropdown = document.querySelector("#walletDropdown");
const walletList = document.querySelector("#walletList");
const installHint = document.querySelector("#installHint");
const walletChip = document.querySelector("#walletChip");
const walletChipIcon = document.querySelector("#walletChipIcon");
const walletChipAddress = document.querySelector("#walletChipAddress");
const disconnectBtn = document.querySelector("#disconnectBtn");
const walletGate = document.querySelector("#walletGate");
const dashboard = document.querySelector("#dashboard");
const walletDot = document.querySelector("#walletDot");
const walletName = document.querySelector("#walletName");
const walletAddress = document.querySelector("#walletAddress");

let appState = null;

// ── Asset options ─────────────────────────────────────────────────────────────
for (const option of assetOptions) {
  const item = document.createElement("option");
  item.value = `${option.sourceChain}:${option.asset}`;
  item.textContent = `${option.asset} from ${option.sourceChain}`;
  assetSelect.append(item);
}
assetSelect.value = `${assetOptions[0].sourceChain}:${assetOptions[0].asset}`;

// ── Wallet UI ─────────────────────────────────────────────────────────────────

function buildWalletDropdown() {
  walletList.replaceChildren();
  const available = getAvailableWallets();
  const installable = getInstallableWallets();

  if (available.length === 0) {
    installHint.hidden = false;
  } else {
    installHint.hidden = true;
    for (const wallet of available) {
      const btn = document.createElement("button");
      btn.className = "wallet-option";
      btn.innerHTML = `
        <img src="${wallet.icon}" alt="${wallet.name}" class="wallet-option-icon" onerror="this.style.display='none'" />
        <span>${wallet.name}</span>
        <span class="wallet-detected">Detected</span>
      `;
      btn.addEventListener("click", async () => {
        walletDropdown.hidden = true;
        try {
          await connectWallet(wallet.id);
        } catch (err) {
          showToast(err.message, "error");
        }
      });
      walletList.append(btn);
    }

    // Also show installable ones as greyed out links
    for (const wallet of installable) {
      const btn = document.createElement("a");
      btn.className = "wallet-option wallet-option--install";
      btn.href = wallet.id === "phantom"
        ? "https://phantom.app"
        : wallet.id === "solflare"
          ? "https://solflare.com"
          : "https://backpack.app";
      btn.target = "_blank";
      btn.innerHTML = `
        <img src="${wallet.icon}" alt="${wallet.name}" class="wallet-option-icon" onerror="this.style.display='none'" />
        <span>${wallet.name}</span>
        <span class="wallet-install">Install ↗</span>
      `;
      walletList.append(btn);
    }
  }
}

function openDropdown() {
  buildWalletDropdown();
  walletDropdown.hidden = false;
}

function closeDropdown() {
  walletDropdown.hidden = true;
}

connectWalletBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  walletDropdown.hidden ? openDropdown() : closeDropdown();
});

gateConnectBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  openDropdown();
  // Position dropdown near the gate button
  const wrap = document.querySelector("#walletConnectWrap");
  wrap.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("click", (e) => {
  if (!document.querySelector("#walletConnectWrap").contains(e.target)) {
    closeDropdown();
  }
});

disconnectBtn.addEventListener("click", async () => {
  await disconnectWallet();
});

// ── Wallet state change handler ───────────────────────────────────────────────

onWalletChange((state) => {
  if (state) {
    // Connected
    const { wallet, publicKey } = state;

    // Show chip, hide connect button
    connectWalletBtn.hidden = true;
    walletChip.hidden = false;
    walletChipIcon.src = wallet.icon;
    walletChipIcon.alt = wallet.name;
    walletChipAddress.textContent = formatAddress(publicKey);

    // Sidebar wallet status
    walletDot.classList.add("connected");
    walletName.textContent = wallet.name;
    walletAddress.textContent = formatAddress(publicKey);

    // Show dashboard, hide gate
    walletGate.hidden = true;
    dashboard.hidden = false;

    showToast(`${wallet.name} connected`, "success");
    refresh();
  } else {
    // Disconnected
    connectWalletBtn.hidden = false;
    walletChip.hidden = true;

    walletDot.classList.remove("connected");
    walletName.textContent = "Not connected";
    walletAddress.textContent = "Connect a Solana wallet";

    walletGate.hidden = false;
    dashboard.hidden = true;

    showToast("Wallet disconnected", "info");
  }
});

// ── Toast notifications ───────────────────────────────────────────────────────

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Main render ───────────────────────────────────────────────────────────────

function getSelectedAsset() {
  const [sourceChain, asset] = assetSelect.value.split(":");
  return assetOptions.find((item) => item.sourceChain === sourceChain && item.asset === asset);
}

function readPolicy() {
  return {
    savingsPercent: Number(savingsInput.value),
    familyPercent: Number(familyInput.value),
    billsPercent: Number(billsInput.value),
    spendLimit: Number(limitInput.value)
  };
}

function readInflow() {
  const selected = getSelectedAsset();
  return {
    ...selected,
    amount: Number(amountInput.value),
    sender: senderInput.value,
    memo: "Private payroll inflow"
  };
}

function render(state = appState) {
  if (!state) return;
  appState = state;
  const latest = state.inflows[0];
  const preview = latest ?? buildEmptyPreview(state);

  labels.savings.textContent = `${savingsInput.value}%`;
  labels.family.textContent = `${familyInput.value}%`;
  labels.bills.textContent = `${billsInput.value}%`;

  document.querySelector("#integrationMode").textContent =
    `${state.integration.mode.toUpperCase()}: ${state.integration.limitations[0]}`;

  const inflowDisplay = document.querySelector("#privateInflow");
  inflowDisplay.textContent = preview.privateView.formattedInflow;
  inflowDisplay.classList.remove("animate-pulse");
  void inflowDisplay.offsetWidth;
  inflowDisplay.classList.add("animate-pulse");

  document.querySelector("#sourceChain").textContent = preview.inflow.sourceChain;
  document.querySelector("#asset").textContent = preview.inflow.asset;
  document.querySelector("#policyState").textContent = preview.policyDecision.status;

  passkeyButton.innerHTML = state.vault.passkeys.length > 0
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Bound`
    : `🔑 Passkey`;

  const approvalBadge = document.querySelector("#approvalBadge");
  approvalBadge.textContent = preview.status === "APPROVED" ? "Ika Approved" : "Policy Active";
  approvalBadge.classList.toggle("review", preview.status !== "APPROVED");

  const allocationsContainer = document.querySelector("#allocations");
  allocationsContainer.replaceChildren(
    ...preview.allocations.map((item) => {
      const row = document.createElement("article");
      row.className = "allocation-item";
      row.innerHTML = `
        <div class="allocation-icon">${item.label.slice(0, 1)}</div>
        <div class="allocation-info">
          <strong>${item.label}</strong>
          <span class="allocation-meta">${item.ciphertextId.slice(0, 12)}...${item.ciphertextId.slice(-8)}</span>
        </div>
        <div class="allocation-amount">${item.privateFormatted}</div>
      `;
      return row;
    })
  );

  renderHistory(state.inflows);
  renderAudit(state.auditLog);
  renderDevnet(state);

  document.querySelector("#traceList").replaceChildren(
    ...preview.publicTrace.map((item) => {
      const row = document.createElement("div");
      row.className = "trace-item";
      row.innerHTML = `<span>${item.label}</span><code>${item.value}</code>`;
      return row;
    })
  );
}

function handleAssetChange() {
  const selected = getSelectedAsset();
  amountInput.value = selected.amountCents / 100;
}

async function bindPasskey() {
  const challenge = await api("/api/passkeys/challenge", { method: "POST" });
  let credentialId = `local-passkey-${challenge.challenge}`;

  if (window.PublicKeyCredential && window.isSecureContext) {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64UrlToBytes(challenge.challenge),
          rp: { name: challenge.rpName },
          user: {
            id: new TextEncoder().encode(challenge.userName),
            name: challenge.userName,
            displayName: "IkaPayFi User"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
          timeout: 60_000,
          attestation: "none"
        }
      });
      credentialId = bytesToBase64Url(new Uint8Array(credential.rawId));
    } catch {
      credentialId = `local-passkey-${challenge.challenge}`;
    }
  }

  const result = await api("/api/passkeys/register", {
    method: "POST",
    body: { challenge: challenge.challenge, credentialId, label: "Primary device passkey" }
  });
  appState.vault = result.vault;
  await refresh();
}

// ── Event listeners ───────────────────────────────────────────────────────────

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConnected()) { showToast("Please connect your wallet first", "error"); return; }

  const submitBtn = form.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Processing Encrypted Graph...";
  submitBtn.disabled = true;

  try {
    await api("/api/policy", { method: "PATCH", body: readPolicy() });
    await api("/api/inflows", { method: "POST", body: readInflow() });
    await refresh();
    showToast("Inflow recorded & policy executed", "success");
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

for (const input of [savingsInput, familyInput, billsInput]) {
  input.addEventListener("input", () => {
    labels.savings.textContent = `${savingsInput.value}%`;
    labels.family.textContent = `${familyInput.value}%`;
    labels.bills.textContent = `${billsInput.value}%`;
  });
}

assetSelect.addEventListener("change", handleAssetChange);
passkeyButton.addEventListener("click", bindPasskey);

resetButton.addEventListener("click", async () => {
  if (!confirm("Reset vault? This clears all inflows and audit history.")) return;
  await api("/api/reset", { method: "POST" });
  await refresh();
  showToast("Vault reset", "info");
});

walletButton.addEventListener("click", async () => {
  walletButton.textContent = "Generating Keypair...";
  try {
    await api("/api/devnet/wallet", { method: "POST" });
    walletButton.textContent = "Wallet Created";
    setTimeout(() => { walletButton.textContent = "Create Devnet Wallet"; }, 2000);
    await refresh();
  } catch (err) {
    walletButton.textContent = "Create Devnet Wallet";
    showToast(err.message, "error");
  }
});

airdropButton.addEventListener("click", async () => {
  airdropButton.textContent = "Requesting SOL...";
  try {
    await api("/api/devnet/airdrop", { method: "POST", body: { sol: 1 } });
    airdropButton.textContent = "SOL Received ✓";
    setTimeout(() => { airdropButton.textContent = "Airdrop SOL"; }, 2000);
    await refresh();
  } catch (error) {
    airdropButton.textContent = "Airdrop Failed";
    setTimeout(() => { airdropButton.textContent = "Airdrop SOL"; }, 2000);
    showToast(error.message, "error");
  }
});

statusButton.addEventListener("click", async () => {
  statusButton.textContent = "Scanning RPC...";
  try {
    const status = await api("/api/devnet/status");
    appState.devnetStatus = status;
    statusButton.textContent = "Check Devnet";
    render(appState);
  } catch (err) {
    statusButton.textContent = "Check Devnet";
    showToast(err.message, "error");
  }
});

// ── API / data helpers ────────────────────────────────────────────────────────

async function refresh() {
  if (!isConnected()) return;
  render(await api("/api/bootstrap"));
}

async function api(path, options = {}) {
  const headers = {};
  if (options.body) headers["content-type"] = "application/json";

  // Pass connected wallet pubkey as authority for all requests
  const pubkey = getPublicKey();
  if (pubkey) headers["x-wallet-pubkey"] = pubkey;

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

function buildEmptyPreview(state) {
  return {
    inflow: { sourceChain: "No inflows", asset: "None" },
    privateView: { formattedInflow: "$0.00" },
    policyDecision: { status: "READY" },
    status: "READY",
    allocations: [],
    publicTrace: [
      { label: "Vault authority", value: getPublicKey() ?? "—" },
      { label: "Vault policy PDA", value: state.vault.solanaPolicyPda },
      { label: "Ika dWallet", value: state.vault.ikaDwallet },
      { label: "Mode", value: state.integration.mode }
    ]
  };
}

function renderHistory(inflows) {
  const list = document.querySelector("#historyList");
  if (inflows.length === 0) {
    list.innerHTML = `<div class="empty-state">No inflows recorded yet.</div>`;
    return;
  }
  list.replaceChildren(
    ...inflows.slice(0, 5).map((item) => {
      const row = document.createElement("article");
      row.className = "history-item";
      row.innerHTML = `
        <div class="history-info">
          <strong>${item.inflow.asset} from ${item.inflow.sourceChain}</strong>
          <span class="allocation-meta">${item.inflow.sender} · ${new Date(item.at).toLocaleTimeString()}</span>
        </div>
        <div class="history-amount">
          <strong>${item.privateView.formattedInflow}</strong>
          <span class="allocation-meta">${item.id.slice(0, 10)}</span>
        </div>
      `;
      return row;
    })
  );
}

function renderAudit(events) {
  const list = document.querySelector("#auditList");
  list.replaceChildren(
    ...events.slice(0, 8).map((item) => {
      const row = document.createElement("article");
      row.className = "audit-item";
      row.innerHTML = `
        <div class="audit-info">
          <strong>${item.type.replace(/_/g, " ")}</strong>
          <span class="allocation-meta">${item.message}</span>
        </div>
        <div class="time">${new Date(item.at).toLocaleTimeString()}</div>
      `;
      return row;
    })
  );
}

function renderDevnet(state) {
  const status = state.devnetStatus;
  const wallet = status?.wallet ?? publicWalletFromState(state.devnet.wallet);
  const encryptAccounts = status?.encryptAccounts ?? state.devnet.encryptAccounts;
  const connectedPubkey = getPublicKey();
  const items = [
    ["Connected wallet", connectedPubkey ? formatAddress(connectedPubkey) : "—"],
    ["Devnet keypair", wallet?.publicKey ? `${wallet.publicKey.slice(0, 8)}...${wallet.publicKey.slice(-8)}` : "Not created"],
    ["Balance", status ? `${status.balanceSol.toFixed(4)} SOL` : "Run scan"],
    ["Encrypt config", status ? (status.encryptConfigFound ? "Found ✓" : "Missing") : "Run scan"],
    ["Deposit PDA", encryptAccounts?.depositPda ? `${encryptAccounts.depositPda.slice(0, 12)}...` : "Pending"]
  ];

  document.querySelector("#devnetList").replaceChildren(
    ...items.map(([label, value]) => {
      const row = document.createElement("div");
      row.className = "trace-item";
      row.innerHTML = `<span>${label}</span><code>${value}</code>`;
      return row;
    })
  );
}

function publicWalletFromState(wallet) {
  if (!wallet) return null;
  return { publicKey: wallet.publicKey };
}

function base64UrlToBytes(text) {
  const padded = `${text}${"=".repeat((4 - (text.length % 4)) % 4)}`;
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
