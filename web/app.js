import { assetOptions } from "../src/engine/demo-data.js";

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

let appState = null;

const labels = {
  savings: document.querySelector("#savingsLabel"),
  family: document.querySelector("#familyLabel"),
  bills: document.querySelector("#billsLabel")
};

// Initialize Asset Options
for (const option of assetOptions) {
  const item = document.createElement("option");
  item.value = `${option.sourceChain}:${option.asset}`;
  item.textContent = `${option.asset} from ${option.sourceChain}`;
  assetSelect.append(item);
}

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

  // Update Labels
  labels.savings.textContent = `${savingsInput.value}%`;
  labels.family.textContent = `${familyInput.value}%`;
  labels.bills.textContent = `${billsInput.value}%`;

  // Update Status & Hero
  document.querySelector("#integrationMode").textContent = 
    `${state.integration.mode.toUpperCase()}: ${state.integration.limitations[0]}`;
  
  const inflowDisplay = document.querySelector("#privateInflow");
  inflowDisplay.textContent = preview.privateView.formattedInflow;
  
  // Animation trigger for amount change
  inflowDisplay.classList.remove("animate-pulse");
  void inflowDisplay.offsetWidth; // trigger reflow
  inflowDisplay.classList.add("animate-pulse");

  document.querySelector("#sourceChain").textContent = preview.inflow.sourceChain;
  document.querySelector("#asset").textContent = preview.inflow.asset;
  document.querySelector("#policyState").textContent = preview.policyDecision.status;
  
  passkeyButton.innerHTML = state.vault.passkeys.length > 0 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Bound` 
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3.5"/></svg> Passkey`;

  const approvalBadge = document.querySelector("#approvalBadge");
  approvalBadge.textContent = preview.status === "APPROVED" ? "Ika Approved" : "Policy Rejected";
  approvalBadge.classList.toggle("review", preview.status !== "APPROVED");

  // Render Allocations
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
  
  // Render Public Trace
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
  render();
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
          authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred"
          },
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
    body: {
      challenge: challenge.challenge,
      credentialId,
      label: "Primary device passkey"
    }
  });
  appState.vault = result.vault;
  await refresh();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = form.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Processing Encrypted Graph...";
  submitBtn.disabled = true;

  try {
    await api("/api/policy", {
      method: "PATCH",
      body: readPolicy()
    });
    await api("/api/inflows", {
      method: "POST",
      body: readInflow()
    });
    await refresh();
  } catch (err) {
    console.error(err);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

for (const input of [amountInput, savingsInput, familyInput, billsInput, limitInput]) {
  input.addEventListener("input", () => {
    labels.savings.textContent = `${savingsInput.value}%`;
    labels.family.textContent = `${familyInput.value}%`;
    labels.bills.textContent = `${billsInput.value}%`;
  });
}

assetSelect.addEventListener("change", handleAssetChange);
passkeyButton.addEventListener("click", bindPasskey);
resetButton.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to reset the vault?")) return;
  await api("/api/reset", { method: "POST" });
  await refresh();
});
walletButton.addEventListener("click", async () => {
  walletButton.textContent = "Generating Keypair...";
  await api("/api/devnet/wallet", { method: "POST" });
  walletButton.textContent = "Wallet Created";
  setTimeout(() => walletButton.textContent = "Create Devnet Wallet", 2000);
  await refresh();
});
airdropButton.addEventListener("click", async () => {
  airdropButton.textContent = "Requesting SOL...";
  try {
    await api("/api/devnet/airdrop", {
      method: "POST",
      body: { sol: 1 }
    });
  } catch (error) {
    appState.devnetStatus = {
      ...(appState.devnetStatus ?? {}),
      wallet: publicWalletFromState(appState.devnet.wallet),
      balanceSol: 0,
      encryptAccounts: appState.devnet.encryptAccounts,
      encryptConfigFound: true,
      error: error.message
    };
    airdropButton.textContent = "Airdrop Failed";
    render(appState);
    return;
  }
  airdropButton.textContent = "SOL Received";
  setTimeout(() => airdropButton.textContent = "Airdrop SOL", 2000);
  await refresh();
});
statusButton.addEventListener("click", async () => {
  statusButton.textContent = "Scanning RPC...";
  const status = await api("/api/devnet/status");
  appState.devnetStatus = status;
  statusButton.textContent = "Check Devnet";
  render(appState);
});

assetSelect.value = `${assetOptions[0].sourceChain}:${assetOptions[0].asset}`;
refresh();

async function refresh() {
  render(await api("/api/bootstrap"));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body;
}

function buildEmptyPreview(state) {
  return {
    inflow: {
      sourceChain: "No inflows",
      asset: "None"
    },
    privateView: {
      formattedInflow: "$0.00"
    },
    policyDecision: {
      status: "READY"
    },
    status: "READY",
    allocations: [],
    publicTrace: [
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
          <strong>${item.type.replace(/_/g, ' ')}</strong>
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
  const items = [
    ["Wallet", wallet?.publicKey?.slice(0, 8) + "..." + wallet?.publicKey?.slice(-8) ?? "Not created"],
    ["Balance", status ? `${status.balanceSol.toFixed(4)} SOL` : "Run scan"],
    ["Encrypt config", status ? (status.encryptConfigFound ? "Found" : "Missing") : "Run scan"],
    ["Deposit PDA", encryptAccounts?.depositPda?.slice(0, 12) + "..." ?? "Pending"]
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
  return {
    publicKey: wallet.publicKey
  };
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
