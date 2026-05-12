import { assetOptions } from "../src/engine/demo-data.js";
import {
  connectWallet,
  disconnectWallet,
  onWalletChange,
  getPublicKey,
  isConnected,
  formatAddress,
  getAvailableWallets,
  getInstallableWallets,
  setSimulatedWallet
} from "./wallet.js";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form              = document.querySelector("#policyForm");
const assetSelect       = document.querySelector("#assetSelect");
const amountInput       = document.querySelector("#amountInput");
const senderInput       = document.querySelector("#senderInput");
const recipientAddress  = document.querySelector("#recipientAddress");
const payrollRef        = document.querySelector("#payrollRef");
const payrollDesc       = document.querySelector("#payrollDesc");
const savingsInput      = document.querySelector("#savingsInput");
const familyInput       = document.querySelector("#familyInput");
const billsInput        = document.querySelector("#billsInput");
const limitInput        = document.querySelector("#limitInput");
const passkeyButton     = document.querySelector("#passkeyButton");
const resetButton       = document.querySelector("#resetButton");
const walletButton      = document.querySelector("#walletButton");
const airdropButton     = document.querySelector("#airdropButton");
const statusButton      = document.querySelector("#statusButton");

const labels = {
  savings: document.querySelector("#savingsLabel"),
  family:  document.querySelector("#familyLabel"),
  bills:   document.querySelector("#billsLabel")
};

// Wallet UI
const connectWalletBtn    = document.querySelector("#connectWalletBtn");
const gatePasskeyBtn      = document.querySelector("#gatePasskeyBtn");
const gateConnectBtn      = document.querySelector("#gateConnectBtn");
const walletDropdown      = document.querySelector("#walletDropdown");
const walletList          = document.querySelector("#walletList");
const installHint         = document.querySelector("#installHint");
const walletChip          = document.querySelector("#walletChip");
const walletChipIcon      = document.querySelector("#walletChipIcon");
const walletChipAddress   = document.querySelector("#walletChipAddress");
const disconnectBtn       = document.querySelector("#disconnectBtn");
const walletGate          = document.querySelector("#walletGate");
const appViews            = document.querySelector("#appViews");
const walletDot           = document.querySelector("#walletDot");
const walletName          = document.querySelector("#walletName");
const walletAddress       = document.querySelector("#walletAddress");

let appState = null;

// ── Asset options ─────────────────────────────────────────────────────────────
for (const option of assetOptions) {
  const item = document.createElement("option");
  item.value = `${option.sourceChain}:${option.asset}`;
  item.textContent = `${option.asset} from ${option.sourceChain}`;
  assetSelect.append(item);
}
assetSelect.value = `${assetOptions[0].sourceChain}:${assetOptions[0].asset}`;

// ── View switching ────────────────────────────────────────────────────────────

const PAGE_TITLES = {
  landing:      "IkaPayFi",
  dashboard:    "Dashboard",
  policy:       "Policy Vault",
  payrolls:     "Payrolls",
  integrations: "Integrations"
};

const appShell   = document.querySelector("#app-shell");
const landingView = document.querySelector("#view-landing");

window.showView = function showView(viewId) {
  if (viewId === "landing") {
    // Show landing, hide app shell
    document.body.classList.add("landing-mode");
    if (landingView) landingView.hidden = false;
    if (appShell) appShell.hidden = true;
    window.scrollTo(0, 0);
    return;
  }

  // Hide landing, show app shell
  document.body.classList.remove("landing-mode");
  if (landingView) landingView.hidden = true;
  if (appShell) appShell.hidden = false;

  // Switch inner view panels
  document.querySelectorAll("#appViews .view").forEach((v) => v.hidden = true);
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));

  const target = document.querySelector(`#view-${viewId}`);
  if (target) target.hidden = false;

  const navBtn = document.querySelector(`[data-view="${viewId}"]`);
  if (navBtn) navBtn.classList.add("active");

  const pageTitle = document.querySelector("#pageTitle");
  if (pageTitle) pageTitle.textContent = PAGE_TITLES[viewId] ?? viewId;

  window.scrollTo(0, 0);
};

document.querySelector("#sidebarNav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  showView(btn.dataset.view);
});

// ── Wallet dropdown ───────────────────────────────────────────────────────────

function buildWalletDropdown() {
  walletList.replaceChildren();
  const available  = getAvailableWallets();
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
        try { await connectWallet(wallet.id); }
        catch (err) { showToast(err.message, "error"); }
      });
      walletList.append(btn);
    }
    for (const wallet of installable) {
      const a = document.createElement("a");
      a.className = "wallet-option wallet-option--install";
      a.href = { phantom: "https://phantom.app", solflare: "https://solflare.com", backpack: "https://backpack.app" }[wallet.id];
      a.target = "_blank";
      a.innerHTML = `
        <img src="${wallet.icon}" alt="${wallet.name}" class="wallet-option-icon" onerror="this.style.display='none'" />
        <span>${wallet.name}</span>
        <span class="wallet-install">Install ↗</span>
      `;
      walletList.append(a);
    }
  }
}

connectWalletBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  walletDropdown.hidden ? (buildWalletDropdown(), walletDropdown.hidden = false) : walletDropdown.hidden = true;
});

gateConnectBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  buildWalletDropdown();
  walletDropdown.hidden = false;
  document.querySelector("#walletConnectWrap").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("click", (e) => {
  if (!document.querySelector("#walletConnectWrap").contains(e.target)) walletDropdown.hidden = true;
});

disconnectBtn.addEventListener("click", () => disconnectWallet());

// ── Wallet state ──────────────────────────────────────────────────────────────

onWalletChange((state) => {
  if (state) {
    const { wallet, publicKey } = state;

    connectWalletBtn.hidden = true;
    walletChip.hidden = false;
    walletChipIcon.src = wallet.icon;
    walletChipIcon.alt = wallet.name;
    walletChipAddress.textContent = formatAddress(publicKey);

    walletDot.classList.add("connected");
    walletName.textContent = wallet.name;
    walletAddress.textContent = formatAddress(publicKey);

    walletGate.hidden = true;
    appViews.hidden = false;
    showView("dashboard");

    showToast(`${wallet.name} connected`, "success");
    refresh();
  } else {
    connectWalletBtn.hidden = false;
    walletChip.hidden = true;

    walletDot.classList.remove("connected");
    walletName.textContent = "Not connected";
    walletAddress.textContent = "Connect a Solana wallet";

    walletGate.hidden = false;
    appViews.hidden = true;

    showToast("Wallet disconnected", "info");
  }
});

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => { toast.classList.remove("toast--visible"); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSelectedAsset() {
  const [sourceChain, asset] = assetSelect.value.split(":");
  return assetOptions.find((item) => item.sourceChain === sourceChain && item.asset === asset);
}

function readPolicy() {
  return {
    savingsPercent: Number(savingsInput.value),
    familyPercent:  Number(familyInput.value),
    billsPercent:   Number(billsInput.value),
    spendLimit:     Number(limitInput.value)
  };
}

function readInflow() {
  const selected = getSelectedAsset();
  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) throw new Error("Please enter a valid amount");
  if (!senderInput.value.trim()) throw new Error("Please enter employee / contractor name");
  return {
    ...selected,
    amount,
    sender:    senderInput.value.trim(),
    recipient: recipientAddress ? recipientAddress.value.trim() : "",
    reference: payrollRef      ? payrollRef.value.trim()       : "",
    memo:      payrollDesc     ? payrollDesc.value.trim()      : "Private payroll inflow"
  };
}

// ── Render ────────────────────────────────────────────────────────────────────

function render(state = appState) {
  if (!state) return;
  appState = state;

  const latest  = state.inflows[0];
  const preview = latest ?? buildEmptyPreview(state);

  // Slider labels
  labels.savings.textContent = `${savingsInput.value}%`;
  labels.family.textContent  = `${familyInput.value}%`;
  labels.bills.textContent   = `${billsInput.value}%`;

  // Status
  document.querySelector("#integrationMode").textContent =
    `${state.integration.mode.toUpperCase()}: ${state.integration.limitations[0]}`;

  // Policy vault view
  const inflowDisplay = document.querySelector("#privateInflow");
  inflowDisplay.textContent = preview.privateView.formattedInflow;
  inflowDisplay.classList.remove("animate-pulse");
  void inflowDisplay.offsetWidth;
  inflowDisplay.classList.add("animate-pulse");

  document.querySelector("#sourceChain").textContent = preview.inflow.sourceChain;
  document.querySelector("#asset").textContent = preview.inflow.asset;
  document.querySelector("#policyState").textContent = preview.policyDecision.status;

  const approvalBadge = document.querySelector("#approvalBadge");
  approvalBadge.textContent = preview.status === "APPROVED" ? "Ika Approved" : "Policy Active";
  approvalBadge.classList.toggle("review", preview.status !== "APPROVED");

  passkeyButton.innerHTML = state.vault.passkeys.length > 0
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Bound`
    : `🔑 Passkey`;

  // Allocations
  document.querySelector("#allocations").replaceChildren(
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

  // Dashboard stats — with animated counters
  const pending = state.inflows.filter((i) => i.status !== "APPROVED").length;
  const balEl = document.querySelector("#statBalance");
  const ifEl  = document.querySelector("#statInflows");
  const pdEl  = document.querySelector("#statPending");

  if (balEl) balEl.textContent = preview.privateView.formattedInflow;
  if (window.animateCounter) {
    animateCounter(ifEl, state.inflows.length);
    animateCounter(pdEl, pending);
  } else {
    if (ifEl) ifEl.textContent = state.inflows.length;
    if (pdEl) pdEl.textContent = pending;
  }
  document.querySelector("#statPolicy").textContent  = preview.policyDecision.status;

  // Pending badge
  const badge = document.querySelector("#pendingBadge");
  badge.hidden = pending === 0;
  badge.textContent = pending;

  // Recent inflows (dashboard)
  renderHistory(state.inflows, document.querySelector("#recentList"), 3);

  // Payrolls view
  renderPayrolls(state.inflows);

  // Payroll stats
  document.querySelector("#pstatTotal").textContent   = state.inflows.length;
  document.querySelector("#pstatPending").textContent = pending;
  document.querySelector("#pstatApproved").textContent = state.inflows.filter((i) => i.status === "APPROVED").length;

  // Trace & Audit
  renderAudit(state.auditLog);
  renderDevnet(state);
  renderTrace(preview);
}

function buildEmptyPreview(state) {
  return {
    inflow: { sourceChain: "—", asset: "—" },
    privateView: { formattedInflow: "$0.00" },
    policyDecision: { status: "READY" },
    status: "READY",
    allocations: [],
    publicTrace: [
      { label: "Vault authority",   value: getPublicKey() ?? "—" },
      { label: "Vault policy PDA",  value: state.vault.solanaPolicyPda },
      { label: "Ika dWallet",       value: state.vault.ikaDwallet },
      { label: "Mode",              value: state.integration.mode }
    ]
  };
}

// ── Payroll approval list ─────────────────────────────────────────────────────

function renderPayrolls(inflows) {
  const container = document.querySelector("#payrollList");
  if (inflows.length === 0) {
    container.innerHTML = `<div class="empty-state" style="margin-top:24px;">
      No payrolls yet. Go to <button class="link-btn" onclick="showView('policy')">Policy Vault</button> to record an inflow.
    </div>`;
    return;
  }

  container.replaceChildren(
    ...inflows.map((item) => {
      const isApproved = item.status === "APPROVED";
      const inflow = item.inflow;
      const card = document.createElement("article");
      card.className = `payroll-card glass-panel ${isApproved ? "payroll-card--approved" : ""}`;
      card.innerHTML = `
        <div class="payroll-header">
          <div class="payroll-meta">
            <div class="payroll-title">
              <span class="asset-chip">${inflow.asset}</span>
              <strong>${inflow.sender || "Unknown"}</strong>
            </div>
            <span class="payroll-sender">${inflow.sourceChain} → Ika dWallet</span>
          </div>
          <div class="payroll-amount">${item.privateView.formattedInflow}</div>
        </div>

        <div class="payroll-detail-grid">
          ${inflow.recipient ? `<div class="payroll-detail-item"><span class="detail-label">Recipient Address</span><code class="detail-value mono">${inflow.recipient.length > 20 ? inflow.recipient.slice(0,8)+"..."+inflow.recipient.slice(-6) : inflow.recipient}</code></div>` : ""}
          ${inflow.reference ? `<div class="payroll-detail-item"><span class="detail-label">Reference</span><span class="detail-value">${inflow.reference}</span></div>` : ""}
          ${inflow.memo && inflow.memo !== "Private payroll inflow" ? `<div class="payroll-detail-item payroll-detail-full"><span class="detail-label">Description</span><span class="detail-value">${inflow.memo}</span></div>` : ""}
        </div>

        <div class="payroll-splits">
          ${item.allocations.map((a) => `
            <div class="split-pill">
              <span class="split-name">${a.label}</span>
              <span class="split-amount">${a.privateFormatted}</span>
            </div>
          `).join("")}
        </div>

        <div class="payroll-footer">
          <span class="payroll-time">${new Date(item.at).toLocaleString()}</span>
          <span class="payroll-id mono">${item.id.slice(0, 16)}...</span>
          ${isApproved
            ? `<span class="approved-pill">✓ Ika Approved</span>`
            : `<button class="btn btn-primary btn-sm approve-btn" data-id="${item.id}">
                 Approve & Sign
               </button>`
          }
        </div>
      `;
      return card;
    })
  );

  // Wire approve buttons
  container.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => approvePayroll(btn.dataset.id, btn));
  });
}

async function approvePayroll(inflowId, btn) {
  if (!isConnected()) { showToast("Connect wallet first", "error"); return; }
  btn.textContent = "Signing...";
  btn.disabled = true;
  try {
    // Generate a dummy message hash (sha256 of inflow ID for demo)
    const hash = await sha256Hex(inflowId);
    await api(`/api/inflows/${inflowId}/approve`, { method: "POST", body: { messageHash: hash } });
    showToast("Payroll approved via Ika dWallet ✓", "success");
    await refresh();
  } catch (err) {
    showToast(err.message, "error");
    btn.textContent = "Approve & Sign";
    btn.disabled = false;
  }
}

async function sha256Hex(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Sub-renders ───────────────────────────────────────────────────────────────

function renderHistory(inflows, container, limit = 5) {
  if (!container) return;
  if (inflows.length === 0) {
    container.innerHTML = `<div class="empty-state">No inflows recorded yet.</div>`;
    return;
  }
  container.replaceChildren(
    ...inflows.slice(0, limit).map((item) => {
      const row = document.createElement("article");
      row.className = "history-item";
      row.innerHTML = `
        <div class="history-info">
          <strong>${item.inflow.asset} from ${item.inflow.sourceChain}</strong>
          <span class="allocation-meta">${item.inflow.sender} · ${new Date(item.at).toLocaleTimeString()}</span>
        </div>
        <div class="history-amount">
          <strong>${item.privateView.formattedInflow}</strong>
          <span class="allocation-meta status-pill ${item.status === "APPROVED" ? "approved" : ""}">${item.status ?? "PENDING"}</span>
        </div>
      `;
      return row;
    })
  );
}

function renderAudit(events) {
  const list = document.querySelector("#auditList");
  if (!list) return;
  list.replaceChildren(
    ...events.slice(0, 12).map((item) => {
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

function renderTrace(preview) {
  const list = document.querySelector("#traceList");
  if (!list) return;
  list.replaceChildren(
    ...preview.publicTrace.map((item) => {
      const row = document.createElement("div");
      row.className = "trace-item";
      row.innerHTML = `<span>${item.label}</span><code>${item.value}</code>`;
      return row;
    })
  );
}

function renderDevnet(state) {
  const list = document.querySelector("#devnetList");
  if (!list) return;
  const status     = state.devnetStatus;
  const wallet     = status?.wallet ?? publicWalletFromState(state.devnet.wallet);
  const encryptAcc = status?.encryptAccounts ?? state.devnet.encryptAccounts;
  const connectedPubkey = getPublicKey();
  const items = [
    ["Connected wallet",   connectedPubkey ? formatAddress(connectedPubkey) : "—"],
    ["Program ID",         "54Rek86pHBP5V6GM4MieoMSup1ueVtuS56Tqz9SQXetb"],
    ["Devnet keypair",     wallet?.publicKey ? `${wallet.publicKey.slice(0, 8)}...${wallet.publicKey.slice(-8)}` : "Not created"],
    ["Balance",            status ? `${status.balanceSol.toFixed(4)} SOL` : "Run scan"],
    ["Encrypt config",     status ? (status.encryptConfigFound ? "Found ✓" : "Missing") : "Run scan"],
    ["Deposit PDA",        encryptAcc?.depositPda ? `${encryptAcc.depositPda.slice(0, 12)}...` : "Pending"]
  ];
  list.replaceChildren(
    ...items.map(([label, value]) => {
      const row = document.createElement("div");
      row.className = "trace-item";
      row.innerHTML = `<span>${label}</span><code>${value}</code>`;
      return row;
    })
  );
}

function publicWalletFromState(wallet) {
  return wallet ? { publicKey: wallet.publicKey } : null;
}

// ── Event listeners ───────────────────────────────────────────────────────────

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConnected()) { showToast("Please connect your wallet first", "error"); return; }
  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.textContent = "Encrypting…";
  submitBtn.disabled = true;
  try {
    await api("/api/policy",  { method: "PATCH", body: readPolicy() });
    // Show the FHE encryption animation overlay
    if (window.showEncryptOverlay) {
      await window.showEncryptOverlay("Encrypting payroll with FHE…", 1800);
    }
    await api("/api/inflows", { method: "POST",  body: readInflow() });
    await refresh();
    showToast("Inflow recorded & policy executed — check Payrolls to approve", "success");
    showView("payrolls");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.textContent = "🔒 Commit Policy & Record Inflow";
    submitBtn.disabled = false;
  }
});

for (const input of [savingsInput, familyInput, billsInput]) {
  input.addEventListener("input", () => {
    labels.savings.textContent = `${savingsInput.value}%`;
    labels.family.textContent  = `${familyInput.value}%`;
    labels.bills.textContent   = `${billsInput.value}%`;
  });
}

assetSelect.addEventListener("change", () => {
  const selected = getSelectedAsset();
  amountInput.value = selected.amountCents / 100;
});

passkeyButton.addEventListener("click", bindPasskey);
if (gatePasskeyBtn) gatePasskeyBtn.addEventListener("click", bindPasskey);

resetButton.addEventListener("click", async () => {
  if (!confirm("Reset vault? This clears all inflows and audit history.")) return;
  await api("/api/reset", { method: "POST" });
  await refresh();
  showToast("Vault reset", "info");
});

walletButton.addEventListener("click", async () => {
  walletButton.textContent = "Generating...";
  try {
    await api("/api/devnet/wallet", { method: "POST" });
    walletButton.textContent = "Created ✓";
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
  } catch (err) {
    airdropButton.textContent = "Airdrop Failed";
    setTimeout(() => { airdropButton.textContent = "Airdrop SOL"; }, 2000);
    showToast(err.message, "error");
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

// ── API ───────────────────────────────────────────────────────────────────────

async function refresh() {
  if (!isConnected()) return;
  render(await api("/api/bootstrap"));
}

async function api(path, options = {}) {
  const headers = {};
  if (options.body) headers["content-type"] = "application/json";
  const pubkey = getPublicKey();
  if (pubkey) headers["x-wallet-pubkey"] = pubkey;
  const response = await fetch(path, {
    method:  options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

// ── Passkey ───────────────────────────────────────────────────────────────────

async function bindPasskey() {
  const challenge = await api("/api/passkeys/challenge", { method: "POST" });
  let credentialId = `local-passkey-${challenge.challenge}`;
  if (window.PublicKeyCredential && window.isSecureContext) {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64UrlToBytes(challenge.challenge),
          rp: { name: challenge.rpName },
          user: { id: new TextEncoder().encode(challenge.userName), name: challenge.userName, displayName: "IkaPayFi User" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
          timeout: 60_000, attestation: "none"
        }
      });
      credentialId = bytesToBase64Url(new Uint8Array(credential.rawId));
    } catch { /* use local fallback */ }
  }
  const result = await api("/api/passkeys/register", {
    method: "POST",
    body: { challenge: challenge.challenge, credentialId, label: "Primary device passkey" }
  });
  appState.vault = result.vault;

  try {
    const devnetRes = await api("/api/devnet/wallet", { method: "POST" });
    appState.devnet = devnetRes;
    setSimulatedWallet(devnetRes.wallet.publicKey);
  } catch (err) {
    showToast("Failed to initialize Devnet wallet: " + err.message, "error");
  }

  await refresh();
}

function base64UrlToBytes(text) {
  const padded = `${text}${"=".repeat((4 - (text.length % 4)) % 4)}`;
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// ── Batch Payroll ──────────────────────────────────────────────────────────────

let batchRowCount = 0;

window.toggleBatchPanel = function() {
  const form = document.getElementById("batchForm");
  const btn  = document.getElementById("batchToggleBtn");
  const hidden = form.hidden;
  form.hidden = !hidden;
  btn.textContent = hidden ? "✕ Cancel" : "+ New Batch";
  if (hidden && document.getElementById("batchRecipients").children.length === 0) {
    addBatchRow(); // auto-add first row
    populateBatchAsset();
  }
};

function populateBatchAsset() {
  const sel = document.getElementById("batchAsset");
  if (!sel || sel.options.length > 0) return;
  const mainSel = document.getElementById("assetSelect");
  if (mainSel) {
    Array.from(mainSel.options).forEach(opt => {
      sel.add(new Option(opt.text, opt.value));
    });
  }
}

window.addBatchRow = function() {
  const id  = ++batchRowCount;
  const row = document.createElement("div");
  row.className = "batch-row";
  row.id = `batch-row-${id}`;
  row.innerHTML = `
    <div class="batch-row-num">${String(id).padStart(2,"0")}</div>
    <div class="input-group batch-name-group">
      <label>Name</label>
      <input type="text" class="batch-name" placeholder="e.g. Alice Chen" />
    </div>
    <div class="input-group batch-addr-group">
      <label>Wallet Address</label>
      <input type="text" class="batch-addr" placeholder="Solana address" />
    </div>
    <div class="input-group batch-amt-group">
      <label>Amount (USD)</label>
      <input type="number" class="batch-amt" min="0" step="0.01" placeholder="0.00"
             oninput="updateBatchTotal()" />
    </div>
    <button class="batch-remove-btn" title="Remove" onclick="removeBatchRow(${id})">✕</button>
  `;
  document.getElementById("batchRecipients").appendChild(row);
  updateBatchTotal();
};

window.removeBatchRow = function(id) {
  document.getElementById(`batch-row-${id}`)?.remove();
  updateBatchTotal();
};

window.updateBatchTotal = function() {
  const amounts = Array.from(document.querySelectorAll(".batch-amt"))
    .map(i => parseFloat(i.value) || 0);
  const total = amounts.reduce((s, v) => s + v, 0);
  const el = document.getElementById("batchTotalDisplay");
  if (el) el.textContent = `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

window.submitBatch = async function() {
  if (!isConnected()) { showToast("Connect your wallet first", "error"); return; }

  const rows = Array.from(document.getElementById("batchRecipients").children);
  if (rows.length === 0) { showToast("Add at least one recipient", "error"); return; }

  const asset   = document.getElementById("batchAsset")?.value || "ETH";
  const ref     = document.getElementById("batchRef")?.value.trim()  || "BATCH-RUN";
  const desc    = document.getElementById("batchDesc")?.value.trim() || "Batch payroll";

  // Collect and validate recipients
  const recipients = [];
  for (const row of rows) {
    const name   = row.querySelector(".batch-name")?.value.trim();
    const addr   = row.querySelector(".batch-addr")?.value.trim();
    const amount = parseFloat(row.querySelector(".batch-amt")?.value);
    if (!name || !amount || amount <= 0) {
      showToast("Fill in all recipient names and amounts", "error"); return;
    }
    recipients.push({ name, addr: addr || "(no address)", amount });
  }

  const btn = document.getElementById("batchSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Encrypting batch…";

  try {
    // Show encryption overlay
    if (window.showEncryptOverlay) {
      await window.showEncryptOverlay(
        `Encrypting ${recipients.length} payroll recipients with FHE…`,
        1400 + recipients.length * 200
      );
    }

    // Submit each recipient as a separate inflow using the current policy
    const policy = readPolicy();
    await api("/api/policy", { method: "PATCH", body: policy });

    for (const r of recipients) {
      const assetInfo = ASSETS.find(a => a.id === asset) || ASSETS[0];
      await api("/api/inflows", {
        method: "POST",
        body: {
          asset:       assetInfo.asset,
          sourceChain: assetInfo.sourceChain,
          amount:      r.amount,
          sender:      r.name,
          recipient:   r.addr,
          reference:   ref,
          memo:        desc,
        }
      });
    }

    await refresh();
    showToast(`✓ Batch of ${recipients.length} payrolls encrypted & submitted — approve them below`, "success");

    // Reset the form
    document.getElementById("batchForm").hidden = true;
    document.getElementById("batchToggleBtn").textContent = "+ New Batch";
    document.getElementById("batchRecipients").innerHTML = "";
    batchRowCount = 0;
    updateBatchTotal();

  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🔒 Encrypt & Submit Batch";
  }
};
