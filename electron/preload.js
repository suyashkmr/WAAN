const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  baseURL: process.env.WAAN_CLIENT_URL || "http://localhost:4173",
});
