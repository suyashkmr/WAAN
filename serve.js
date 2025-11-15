#!/usr/bin/env node
/**
 * Lightweight static server for the WAAN dashboard.
 * Serves everything from the repo root so the browser can fetch
 * chat.json/analytics.json and JS modules without extra tooling.
 */
const path = require("path");
const express = require("express");

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.WAAN_CLIENT_PORT || process.env.PORT || 4173);
const HOST = process.env.WAAN_CLIENT_HOST || process.env.HOST || "0.0.0.0";

const app = express();

app.use(
  express.static(ROOT, {
    extensions: ["html"],
    etag: false,
    setHeaders: res => {
      res.setHeader("Cache-Control", "no-store");
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
