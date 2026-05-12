import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { handleApi, sendJson } from "../src/server/api.mjs";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, "..");
const port = Number(process.env.PORT ?? 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function resolvePath(url) {
  const pathname = new URL(url, `http://localhost:${port}`).pathname;
  const clean = normalize(pathname === "/" ? "/web/index.html" : pathname);
  if (clean.includes("..")) return null;
  return join(root, clean);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (url.pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, url.pathname);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  const filePath = resolvePath(req.url ?? "/");
  if (!filePath) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": types[extname(filePath)] ?? "application/octet-stream"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`IkaPayFi demo running at http://localhost:${port}`);
});
