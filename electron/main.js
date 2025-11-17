if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const express = require("express");

const DEFAULT_CLIENT_PORT = Number(
  process.env.WAAN_CLIENT_PORT || process.env.PORT || 4173
);
const DEFAULT_CLIENT_HOST =
  process.env.WAAN_CLIENT_HOST || process.env.HOST || "127.0.0.1";
const DEFAULT_API_PORT = Number(process.env.WAAN_API_PORT || 3334);
const DEFAULT_RELAY_PORT = Number(process.env.WAAN_RELAY_PORT || 4546);

let relayProcess = null;
let staticServer = null;

const getRuntimeRoot = () =>
  app.isPackaged ? path.join(process.resourcesPath, "waan") : path.resolve(__dirname, "..");

const getWebRoot = () =>
  app.isPackaged ? path.join(process.resourcesPath, "waan", "web") : path.resolve(__dirname, "..");

const getServerRoot = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "waan", "apps", "server")
    : path.resolve(__dirname, "..", "apps", "server");

const getScriptsRoot = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "waan", "scripts")
    : path.resolve(__dirname, "..", "scripts");

function spawnNode(scriptPath, args = [], { cwd, env } = {}) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: cwd || path.dirname(scriptPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ...env,
    },
    stdio: "inherit",
  });
  child.on("error", error => {
    // eslint-disable-next-line no-console
    console.error(`[WAAN] Failed to launch ${path.basename(scriptPath)}:`, error);
  });
  return child;
}

function runRestoreScript() {
  const scriptPath = path.join(getScriptsRoot(), "restore-waandata.js");
  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const task = spawnNode(scriptPath, [], { cwd: getRuntimeRoot() });
    task.once("exit", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`restore-waandata exited with code ${code}`));
      }
    });
  });
}

function startRelayProcess() {
  const entry = path.join(getServerRoot(), "src", "index.js");
  const args = ["--auto-start"];
  relayProcess = spawnNode(entry, args, {
    cwd: getServerRoot(),
    env: {
      WAAN_API_PORT: String(DEFAULT_API_PORT),
      WAAN_RELAY_PORT: String(DEFAULT_RELAY_PORT),
    },
  });
}

function startStaticServer() {
  const webRoot = getWebRoot();
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
    res.sendFile(path.join(webRoot, "index.html"));
  });

  return new Promise((resolve, reject) => {
    staticServer = appServer
      .listen(DEFAULT_CLIENT_PORT, DEFAULT_CLIENT_HOST, () => {
        // eslint-disable-next-line no-console
        console.log(
          `[WAAN] Static dashboard available at http://${DEFAULT_CLIENT_HOST}:${DEFAULT_CLIENT_PORT}`
        );
        resolve();
      })
      .on("error", error => {
        reject(error);
      });
  });
}

async function startBackend() {
  await runRestoreScript();
  await startStaticServer();
  startRelayProcess();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
  });
  const clientUrl =
    process.env.WAAN_CLIENT_URL || `http://${DEFAULT_CLIENT_HOST}:${DEFAULT_CLIENT_PORT}`;
  win.loadURL(clientUrl);
}

function stopBackend() {
  if (relayProcess && !relayProcess.killed) {
    relayProcess.kill("SIGINT");
    relayProcess = null;
  }
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}

app
  .whenReady()
  .then(async () => {
    try {
      await startBackend();
      createWindow();
    } catch (error) {
      stopBackend();
      // eslint-disable-next-line no-console
      console.error("[WAAN] Failed to launch backend:", error);
      dialog.showErrorBox("WAAN failed to start", error.message);
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch(error => {
    // eslint-disable-next-line no-console
    console.error("[WAAN] Unexpected startup failure:", error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopBackend();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});
