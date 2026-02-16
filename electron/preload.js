const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  baseURL: process.env.WAAN_CLIENT_URL || "http://localhost:4173",
  openRelayPortal: () => ipcRenderer.invoke("relay.open-portal"),
  onRelayAction: handler => {
    ipcRenderer.on("relay.action", (_event, action) => handler?.(action));
  },
  updateRelayStatus: status => ipcRenderer.invoke("relay.status.update", status),
  notifySyncSummary: payload => ipcRenderer.invoke("relay.sync.summary", payload),
  getRelayAutostart: () => ipcRenderer.invoke("relay.autostart.get"),
  setRelayAutostart: value => ipcRenderer.invoke("relay.autostart.set", value),
});
