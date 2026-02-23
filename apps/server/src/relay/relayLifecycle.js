const path = require("path");
const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");

function fileExists(filePath) {
  if (!filePath) return false;
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveAutoBrowserPath() {
  if (process.platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(
        process.env.HOME || "",
        "Applications",
        "Google Chrome.app",
        "Contents",
        "MacOS",
        "Google Chrome"
      ),
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      path.join(
        process.env.HOME || "",
        "Applications",
        "Chromium.app",
        "Contents",
        "MacOS",
        "Chromium"
      ),
    ];
    return candidates.find(fileExists) || null;
  }

  return null;
}

function resolveBrowserExecutablePath(explicitPath) {
  if (explicitPath) {
    if (!fileExists(explicitPath)) {
      throw new Error(`Configured relay browser executable does not exist: ${explicitPath}`);
    }
    return explicitPath;
  }

  // Prefer an installed local browser on packaged macOS builds to avoid
  // relying on a pre-populated Puppeteer download cache.
  return resolveAutoBrowserPath();
}

function createRelayClient({ dataDir, headless, browserPath, disableGpu }) {
  const sessionDir = path.join(dataDir, "relay-session");
  const puppeteerArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
  ];
  if (disableGpu) {
    puppeteerArgs.push("--disable-gpu");
  }
  if (!headless) {
    puppeteerArgs.push("--start-minimized");
  }
  const executablePath = resolveBrowserExecutablePath(browserPath);

  return new Client({
    puppeteer: {
      headless,
      args: puppeteerArgs,
      ...(executablePath ? { executablePath } : {}),
    },
    authStrategy: new LocalAuth({ dataPath: sessionDir, clientId: "waan" }),
  });
}

function wireRelayClientEvents(client, handlers = {}) {
  if (!client) return;
  const {
    onQr,
    onAuthenticated,
    onAuthFailure,
    onReady,
    onChangeState,
    onDisconnected,
    onLoadingScreen,
    onMessage,
  } = handlers;

  if (typeof onQr === "function") client.on("qr", onQr);
  if (typeof onAuthenticated === "function") client.on("authenticated", onAuthenticated);
  if (typeof onAuthFailure === "function") client.on("auth_failure", onAuthFailure);
  if (typeof onReady === "function") client.on("ready", onReady);
  if (typeof onChangeState === "function") client.on("change_state", onChangeState);
  if (typeof onDisconnected === "function") client.on("disconnected", onDisconnected);
  if (typeof onLoadingScreen === "function") client.on("loading_screen", onLoadingScreen);
  if (typeof onMessage === "function") client.on("message", onMessage);
}

module.exports = {
  createRelayClient,
  wireRelayClientEvents,
};
