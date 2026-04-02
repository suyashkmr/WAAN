if (process.env.ELECTRON_RUN_AS_NODE) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const { app, BrowserWindow, dialog, shell, ipcMain, Menu, Notification } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const {
  getServerBuildFingerprint,
  autostartReusedRelayIfNeeded,
  assertReusableExistingClient,
  assertReusableExistingBackend,
  formatHostForUrl,
  resolveReachableClientHost,
} = require("./mainStartupHelpers.cjs");
const { buildRelayLaunchConfig } = require("./relayLaunchConfig.cjs");
const { detectExistingBackend, detectExistingClient } = require("./backendHealth.cjs");
const { createStaticDashboardServer } = require("./staticDashboardServer.cjs");

const DEFAULT_CLIENT_PORT = Number(
  process.env.WAAN_CLIENT_PORT || process.env.PORT || 4173
);
const DEFAULT_CLIENT_HOST =
  process.env.WAAN_CLIENT_HOST || process.env.HOST || "127.0.0.1";
const DEFAULT_CLIENT_PROBE_HOST = resolveReachableClientHost(DEFAULT_CLIENT_HOST);
const DEFAULT_BACKEND_HOST = process.env.WAAN_BIND_HOST || "127.0.0.1";
const DEFAULT_BACKEND_PROBE_HOST = resolveReachableClientHost(DEFAULT_BACKEND_HOST);
const DEFAULT_API_PORT = Number(process.env.WAAN_API_PORT || 3334);
const DEFAULT_RELAY_PORT = Number(process.env.WAAN_RELAY_PORT || 4546);
const DEFAULT_CLIENT_URL = process.env.WAAN_CLIENT_URL || `http://${formatHostForUrl(DEFAULT_CLIENT_PROBE_HOST)}:${DEFAULT_CLIENT_PORT}`;
const DEFAULT_API_BASE = `http://${formatHostForUrl(DEFAULT_BACKEND_PROBE_HOST)}:${DEFAULT_API_PORT}/api`;
const DEFAULT_RELAY_BASE = `http://${formatHostForUrl(DEFAULT_BACKEND_PROBE_HOST)}:${DEFAULT_RELAY_PORT}`;
const RELAY_PORTAL_URL = "https://relay.chatscope.app";

let relayProcess = null;
let staticServer = null;
let mainWindow = null;
const preloadPath = path.join(__dirname, "preload.js");
let cachedRelayStatus = null;
let cachedRelayAutostart = true;
let cachedPreferences = null;

function getPreferencesPath() {
  return path.join(app.getPath("userData"), "preferences.json");
}

function loadPreferences() {
  if (cachedPreferences) return cachedPreferences;
  try {
    cachedPreferences = JSON.parse(fs.readFileSync(getPreferencesPath(), "utf8"));
  } catch (error) {
    cachedPreferences = {};
  }
  return cachedPreferences;
}

function savePreferences(prefs) {
  const prefPath = getPreferencesPath();
  fs.mkdirSync(path.dirname(prefPath), { recursive: true });
  fs.writeFileSync(prefPath, JSON.stringify(prefs, null, 2));
  cachedPreferences = prefs;
}

function initAutostartPreference() {
  const prefs = loadPreferences();
  const value = typeof prefs.autostartRelay === "boolean" ? prefs.autostartRelay : true;
  cachedRelayAutostart = value;
  return value;
}

function persistAutostartPreference(value) {
  const prefs = loadPreferences();
  prefs.autostartRelay = Boolean(value);
  savePreferences(prefs);
  cachedRelayAutostart = prefs.autostartRelay;
}

const getRuntimeRoot = () =>
  app.isPackaged ? path.join(process.resourcesPath, "waan") : path.resolve(__dirname, "..");

const getWebRoot = () =>
  app.isPackaged ? path.join(process.resourcesPath, "waan", "web") : path.resolve(__dirname, "..", "dist");

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
  const scriptPath = path.join(getScriptsRoot(), "restore-waandata.cjs");
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

function startRelayProcess({ autostart = true } = {}) {
  const { entry, args, cwd, env } = buildRelayLaunchConfig({
    autostart,
    getServerRoot,
    apiPort: DEFAULT_API_PORT,
    relayPort: DEFAULT_RELAY_PORT,
  });
  relayProcess = spawnNode(entry, args, { cwd, env });
}

function startStaticServer() {
  return createStaticDashboardServer({
    webRoot: getWebRoot(),
    host: DEFAULT_CLIENT_HOST,
    port: DEFAULT_CLIENT_PORT,
  }).then(server => {
    staticServer = server;
  });
}

function getExpectedDashboardModuleEntries() {
  try {
    const indexPath = path.join(getWebRoot(), "index.html");
    const html = fs.readFileSync(indexPath, "utf8");
    return Array.from(
      html.matchAll(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/gi),
      match => match[1],
    ).filter(src => src.startsWith("/assets/"));
  } catch {
    return [];
  }
}

function getExpectedDashboardDocument() {
  try {
    return fs.readFileSync(path.join(getWebRoot(), "index.html"), "utf8");
  } catch {
    return null;
  }
}

function getExpectedUnpackagedDashboardEntries() {
  try {
    const indexPath = path.join(__dirname, "..", "index.html");
    const html = fs.readFileSync(indexPath, "utf8");
    const moduleEntries = Array.from(
      html.matchAll(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/gi),
      match => match[1],
    );
    if (moduleEntries.includes("/src/main.js") && !moduleEntries.includes("/@vite/client")) {
      return ["/@vite/client", ...moduleEntries];
    }
    return moduleEntries;
  } catch {
    return ["/@vite/client", "/src/main.js"];
  }
}

function getExpectedUnpackagedDashboardDocument() {
  try {
    return fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  } catch {
    return null;
  }
}

function getExpectedUnpackagedDashboardEntrySets() {
  const entrySets = [];
  const distEntries = getExpectedDashboardModuleEntries();
  if (distEntries.length) {
    entrySets.push(distEntries);
  }
  const devEntries = getExpectedUnpackagedDashboardEntries();
  if (devEntries.length) {
    entrySets.push(devEntries);
  }
  return entrySets;
}

async function startBackend() {
  await runRestoreScript();
  const serverRoot = getServerRoot();
  const expectedServerBuildFingerprint = getServerBuildFingerprint({ serverRoot });
  let expectedServerVersion = null;
  try {
    expectedServerVersion = require(path.join(serverRoot, "package.json")).version || null;
  } catch {
    expectedServerVersion = null;
  }
  const existingClient = await detectExistingClient({
    clientUrl: DEFAULT_CLIENT_URL,
    allowSourceEntry: !app.isPackaged,
    expectedModuleEntries: app.isPackaged ? getExpectedDashboardModuleEntries() : null,
    expectedModuleEntrySets: app.isPackaged ? null : getExpectedUnpackagedDashboardEntrySets(),
    expectedBuiltDocument: getExpectedDashboardDocument(),
    expectedSourceDocument: app.isPackaged ? null : getExpectedUnpackagedDashboardDocument(),
    requireAllExpectedModuleEntries: !app.isPackaged,
  });
  if (existingClient.ok) {
    // eslint-disable-next-line no-console
    console.log(`[WAAN] Reusing existing local dashboard at ${DEFAULT_CLIENT_URL}.`);
  } else {
    assertReusableExistingClient({ existingClient, clientUrl: DEFAULT_CLIENT_URL });
    await startStaticServer();
  }
  const existingBackend = await detectExistingBackend({
    apiBase: DEFAULT_API_BASE,
    relayBase: DEFAULT_RELAY_BASE,
    expectedVersion: expectedServerVersion,
    expectedBuildFingerprint: expectedServerBuildFingerprint,
  });
  if (existingBackend.ok) {
    cachedRelayStatus = existingBackend.relayStatus;
    // eslint-disable-next-line no-console
    console.log("[WAAN] Reusing existing local backend on 127.0.0.1.");
    cachedRelayStatus = await autostartReusedRelayIfNeeded({
      relayBase: DEFAULT_RELAY_BASE,
      relayStatus: existingBackend.relayStatus,
      autostart: cachedRelayAutostart,
      onWarn: error => {
        console.error("[WAAN] Reused backend relay auto-start failed:", error);
      },
    });
  } else {
    assertReusableExistingBackend({
      existingBackend,
      apiBase: DEFAULT_API_BASE,
      relayBase: DEFAULT_RELAY_BASE,
    });
    startRelayProcess({ autostart: cachedRelayAutostart });
  }
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
      additionalArguments: [
        `--waan-api-base=${DEFAULT_API_BASE}`,
        `--waan-relay-base=${DEFAULT_RELAY_BASE}`,
        `--waan-client-url=${DEFAULT_CLIENT_URL}`,
        `--waan-version=${app.getVersion()}`,
      ],
    },
  });
  mainWindow.loadURL(DEFAULT_CLIENT_URL);
  mainWindow.webContents.on("context-menu", (_event, params) => {
    const template = [];
    const hasSelection = Boolean(params.selectionText && params.selectionText.trim());

    if (params.isEditable) {
      template.push(
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      );
    } else if (hasSelection) {
      template.push({ role: "copy" }, { role: "selectAll" });
    } else {
      template.push({ role: "selectAll" });
    }

    if (!app.isPackaged) {
      template.push(
        { type: "separator" },
        {
          label: "Inspect Element",
          click: () => {
            mainWindow?.webContents.inspectElement(params.x, params.y);
          },
        }
      );
    }

    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });
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
ipcMain.handle("relay.autostart.get", () => cachedRelayAutostart);
ipcMain.handle("relay.autostart.set", (_event, value) => {
  persistAutostartPreference(Boolean(value));
  return cachedRelayAutostart;
});

app
  .whenReady()
  .then(async () => {
    try {
      await require("electron").session.defaultSession.clearCache();
      initAutostartPreference();
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
