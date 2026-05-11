import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

process.env.IKAPAYFI_DB_PATH = join(tmpdir(), `ikapayfi-test-${Date.now()}.json`);

const { handleApi, sendJson } = await import("../src/server/api.mjs");

function createTestServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      await handleApi(req, res, url.pathname);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

test("API records inflows, allocations, approvals, and persistent balances", async (t) => {
  const { server, baseUrl } = await createTestServer();
  t.after(() => server.close());

  const created = await postJson(`${baseUrl}/api/inflows`, {
    sourceChain: "Ethereum",
    asset: "ETH",
    amount: 3250,
    sender: "Remote Studio DAO",
    memo: "May payroll"
  });

  assert.equal(created.inflow.status, "APPROVED");
  assert.equal(created.approval.canSign, true);
  assert.equal(created.vault.balances.savings, 81250);
  assert.equal(created.vault.balances.family, 65000);

  const bootstrap = await fetchJson(`${baseUrl}/api/bootstrap`);

  assert.equal(bootstrap.inflows.length, 1);
  assert.equal(bootstrap.approvals.length, 1);
  assert.equal(bootstrap.vault.balances.bills, 97500);
});

async function postJson(url, body) {
  return fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  assert.equal(response.ok, true, body.error);
  return body;
}
