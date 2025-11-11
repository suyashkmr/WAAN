const path = require("path");
const fs = require("fs");
const {
  app,
  BrowserWindow,
  dialog,
  shell,
  nativeTheme,
} = require("electron");

const isDev = !app.isPackaged;

function resolveWebEntry() {
  const repoRoot = path.resolve(__dirname, "../../..");
  const devIndex = path.join(repoRoot, "index.html");
  if (isDev && fs.existsSync(devIndex)) {
    return devIndex;
  }
  const packaged = path.join(process.resourcesPath, "web", "index.html");
  if (fs.existsSync(packaged)) {
    return packaged;
  }
  throw new Error("Unable to find web assets. Run npm run sync:web first.");
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: "WAAN Client",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#fff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const entry = resolveWebEntry();
  mainWindow.loadFile(entry).catch(error => {
    dialog.showErrorBox("WAAN Client", `Failed to load UI: ${error.message}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length) {
      const [window] = allWindows;
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
