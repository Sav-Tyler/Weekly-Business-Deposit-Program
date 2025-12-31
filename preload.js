const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appApi', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveDeposit: (data) => ipcRenderer.invoke('deposit:save', data),
  savePettyCash: (data) => ipcRenderer.invoke('pettycash:save', data),
  print: (html) => ipcRenderer.invoke('print', html)
});
