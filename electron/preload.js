const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getInstalledBrowsers: () => ipcRenderer.invoke('get-browsers'),
    launchPortal: (data) => ipcRenderer.invoke('launch-portal', data),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, data) => callback(data)),
    installUpdate: () => ipcRenderer.invoke('install-update')
});
