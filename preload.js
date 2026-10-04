const { contextBridge, ipcRenderer } = require("electron");

// Só a tela "sem internet" usa isto: um botão para tentar de novo.
contextBridge.exposeInMainWorld("appDesktop", {
  tentarNovamente: () => ipcRenderer.send("tentar-novamente"),
});
