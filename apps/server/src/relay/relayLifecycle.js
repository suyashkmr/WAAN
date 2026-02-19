const path = require("path");
const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");

function resolveBrowserExecutablePath(explicitPath) {
  if (explicitPath) {
    if (!fs.existsSync(explicitPath)) {
      throw new Error(`Configured relay browser executable does not exist: ${explicitPath}`);
    }
    return explicitPath;
  }
  // Default to Puppeteer's browser resolution unless the user explicitly overrides it.
  return null;
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
