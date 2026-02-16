const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");

function createRelayClient({ dataDir, headless }) {
  const sessionDir = path.join(dataDir, "relay-session");
  const puppeteerArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
  ];
  if (!headless) {
    puppeteerArgs.push("--start-minimized");
  }

  return new Client({
    puppeteer: {
      headless,
      args: puppeteerArgs,
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
