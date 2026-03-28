const path = require("path");
const express = require("express");

function createStaticDashboardServer({
  webRoot,
  host = "127.0.0.1",
  port = 4173,
  logPrefix = "[WAAN]",
} = {}) {
  if (!webRoot) {
    throw new Error("createStaticDashboardServer requires a webRoot");
  }

  const appServer = express();

  appServer.use(
    express.static(webRoot, {
      extensions: ["html"],
      etag: false,
      setHeaders: res => {
        res.setHeader("Cache-Control", "no-store");
      },
    })
  );

  appServer.use((_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(webRoot, "index.html"));
  });

  return new Promise((resolve, reject) => {
    const server = appServer
      .listen(port, host, () => {
        // eslint-disable-next-line no-console
        console.log(`${logPrefix} Static dashboard available at http://${host}:${port}`);
        resolve(server);
      })
      .on("error", error => {
        reject(error);
      });
  });
}

async function runAsCli() {
  const webRoot = process.env.WAAN_WEB_ROOT;
  const host = process.env.WAAN_CLIENT_HOST || process.env.HOST || "127.0.0.1";
  const port = Number(process.env.WAAN_CLIENT_PORT || process.env.PORT || 4173);
  await createStaticDashboardServer({ webRoot, host, port });
}

if (require.main === module) {
  runAsCli().catch(error => {
    // eslint-disable-next-line no-console
    console.error("[WAAN] Failed to start static dashboard:", error);
    process.exit(1);
  });
}

module.exports = {
  createStaticDashboardServer,
};
