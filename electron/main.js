const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let relayProcess = null;
let clientProcess = null;

function startBackend() {
  const repoRoot = path.resolve(__dirname, "..");

  relayProcess = spawn("npm", ["start", "--workspace", "apps/server", "--", "--auto-start"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      WAAN_API_PORT: process.env.WAAN_API_PORT || "3334",
      WAAN_RELAY_PORT: process.env.WAAN_RELAY_PORT || "4546",
    },
    stdio: "inherit",
  });

  clientProcess = spawn("node", ["serve.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      WAAN_CLIENT_PORT: process.env.WAAN_CLIENT_PORT || "4173",
    },
    stdio: "inherit",
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
  });
  win.loadURL(process.env.WAAN_CLIENT_URL || "http://localhost:4173");
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (relayProcess) relayProcess.kill("SIGINT");
  if (clientProcess) clientProcess.kill("SIGINT");
  if (process.platform !== "darwin") app.quit();
});
