const { contextBridge } = require("electron");

function getArgValue(key) {
  const prefix = `--${key}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

const apiBase =
  getArgValue("waan-api-base") || process.env.WAAN_API_BASE || "http://127.0.0.1:3333/api";
const relayBase =
  getArgValue("waan-relay-base") ||
  process.env.WAAN_RELAY_CTRL_BASE ||
  "http://127.0.0.1:4545";

contextBridge.exposeInMainWorld("WAAN_API_BASE", apiBase);
contextBridge.exposeInMainWorld("RELAY_CTRL_BASE", relayBase);
contextBridge.exposeInMainWorld("waan", {
  getConfig: () => ({
    apiBase,
    relayBase,
  }),
});
