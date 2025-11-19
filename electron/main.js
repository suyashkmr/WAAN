if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const { app, BrowserWindow, dialog, shell, ipcMain, Menu, Notification } = require("electron");
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
const RELAY_PORTAL_URL = "https://relay.chatscope.app";

let relayProcess = null;
let staticServer = null;
let mainWindow = null;
const preloadPath = path.join(__dirname, "preload.js");
let cachedRelayStatus = null;

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
      WAAN_RELAY_HEADLESS: "false",
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
  buildAppMenu();
}

function createWindow() {
  if (mainWindow) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const clientUrl =
    process.env.WAAN_CLIENT_URL || `http://${DEFAULT_CLIENT_HOST}:${DEFAULT_CLIENT_PORT}`;
  mainWindow.loadURL(clientUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function openRelayPortal({ preferChrome = false } = {}) {
  if (preferChrome && process.platform === "darwin") {
    try {
      await runCommand("open", ["-a", "Google Chrome", RELAY_PORTAL_URL]);
      return { method: "chrome" };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[WAAN] Failed to open relay portal in Chrome:", error);
    }
  }
  await shell.openExternal(RELAY_PORTAL_URL);
  return { method: "default" };
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

function sendRelayNotification(body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: "WAAN Relay",
    body,
  });
  notification.show();
}

function emitStatusChange(status) {
  const previous = cachedRelayStatus;
  cachedRelayStatus = status;
  if (!status) return;
  if (
    status.status === "running" &&
    status.account &&
    (!previous || previous.status !== "running")
  ) {
    const name = status.account.pushName || status.account.wid || "ChatScope";
    const chatCount = Number(status.chatCount) || 0;
    sendRelayNotification(
      chatCount ? `${name} connected · ${chatCount.toLocaleString()} chats mirrored.` : `${name} connected on WAAN.`
    );
  }
}

function buildAppMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Relay",
      submenu: [
        {
          label: "Connect",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("relay.action", "connect");
            }
          },
        },
        {
          label: "Disconnect",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("relay.action", "disconnect");
            }
          },
        },
        {
          label: "Show Relay Portal",
          click: () => {
            openRelayPortal({ preferChrome: true });
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      role: "window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  buildDockMenu();
}

function buildDockMenu() {
  if (process.platform !== "darwin" || !app.dock) return;
  const dockMenu = Menu.buildFromTemplate([
    {
      label: "Connect Relay",
      click: () => {
        if (mainWindow) mainWindow.webContents.send("relay.action", "connect");
      },
    },
    {
      label: "Disconnect Relay",
      click: () => {
        if (mainWindow) mainWindow.webContents.send("relay.action", "disconnect");
      },
    },
    {
      label: "Show Relay Portal",
      click: () => {
        openRelayPortal({ preferChrome: true });
      },
    },
  ]);
  app.dock.setMenu(dockMenu);
}

ipcMain.handle("relay.open-portal", async () => {
  try {
    const result = await openRelayPortal({ preferChrome: true });
    return { success: true, ...result };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[WAAN] Unable to launch relay portal:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("relay.status", () => cachedRelayStatus || null);
ipcMain.handle("relay.status.update", (_event, status) => {
  emitStatusChange(status);
  return true;
});
ipcMain.handle("relay.sync.summary", (_event, payload = {}) => {
  const count = Number(payload.syncedChats);
  if (Number.isFinite(count) && count > 0) {
    sendRelayNotification(`Synced ${count.toLocaleString()} chats from the relay.`);
  }
  return true;
});

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
      if (BrowserWindow.getAllWindows().length === 0 || !mainWindow) {
        createWindow();
      }
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
