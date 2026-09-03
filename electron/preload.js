const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getInstalledBrowsers: () => ipcRenderer.invoke('get-browsers'),
    launchPortal: (data) => ipcRenderer.invoke('launch-portal', data)
});
