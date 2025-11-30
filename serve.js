#!/usr/bin/env node
/**
 * Lightweight static server for the WAAN dashboard.
 * Serves everything from the repo root so the browser can fetch
 * chat.json/analytics.json and JS modules without extra tooling.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.WAAN_CLIENT_PORT || process.env.PORT || 4173);
const HOST = process.env.WAAN_CLIENT_HOST || process.env.HOST || "0.0.0.0";

const app = express();

app.use(
  express.static(ROOT, {
    extensions: ["html"],
    etag: false,
    setHeaders: (res, filePath) => {
      res.setHeader("Cache-Control", "no-store");
      // Ensure font files are served with correct MIME type
      if (filePath.endsWith('.woff2')) {
        res.setHeader("Content-Type", "font/woff2");
      } else if (filePath.endsWith('.woff')) {
        res.setHeader("Content-Type", "font/woff");
      }
    },
  })
);

// Fallback to index.html for any unknown route (keeps relative imports working)
app.use((_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`WAAN dashboard available at http://${HOST}:${PORT}`);
});
