const { contextBridge, ipcRenderer } = require("electron");

function readArgValue(prefix) {
  const arg = process.argv.find(entry => typeof entry === "string" && entry.startsWith(prefix));
  if (!arg) return "";
  return arg.slice(prefix.length);
}

function buildRuntimeConfig() {
  const apiBase =
    readArgValue("--waan-api-base=")
    || process.env.WAAN_API_BASE
    || "http://127.0.0.1:3334/api";
  const relayBase =
    readArgValue("--waan-relay-base=")
    || process.env.WAAN_RELAY_BASE
    || "http://127.0.0.1:4546";
  const clientUrl =
    readArgValue("--waan-client-url=")
    || process.env.WAAN_CLIENT_URL
    || "http://localhost:4173";
  const version =
    readArgValue("--waan-version=")
    || process.env.WAAN_VERSION
    || "";
  return {
    apiBase,
    relayBase,
    clientUrl,
    version,
  };
}

const runtimeConfig = buildRuntimeConfig();
contextBridge.exposeInMainWorld("WAAN_CONFIG", runtimeConfig);

contextBridge.exposeInMainWorld("electronAPI", {
  baseURL: runtimeConfig.clientUrl,
  config: runtimeConfig,
  openRelayPortal: () => ipcRenderer.invoke("relay.open-portal"),
  onRelayAction: handler => {
    ipcRenderer.on("relay.action", (_event, action) => handler?.(action));
  },
  updateRelayStatus: status => ipcRenderer.invoke("relay.status.update", status),
  notifySyncSummary: payload => ipcRenderer.invoke("relay.sync.summary", payload),
  getRelayAutostart: () => ipcRenderer.invoke("relay.autostart.get"),
  setRelayAutostart: value => ipcRenderer.invoke("relay.autostart.set", value),
});
