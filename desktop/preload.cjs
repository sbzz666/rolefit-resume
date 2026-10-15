const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rolefitDesktop", {
  getConfig: () => ipcRenderer.invoke("desktop:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("desktop:save-config", config),
  testConnection: (config) => ipcRenderer.invoke("desktop:test-connection", config),
  generate: (input) => ipcRenderer.invoke("desktop:generate", input)
});

