import { handleApi } from "../src/server/api.mjs";

export default async function handler(req, res) {
  // Vercel populates req.url with the incoming request path (e.g. /api/bootstrap)
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    await handleApi(req, res, url.pathname);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
