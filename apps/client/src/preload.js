const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("waan", {
  getConfig: () => ({
    mode: "offline",
  }),
});
