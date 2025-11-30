const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getHistory: () => ipcRenderer.invoke('get-history'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    saveHistory: (data) => ipcRenderer.invoke('save-history', data),
    startScraping: (options) => ipcRenderer.invoke('start-scraping', options),
    stopScraping: () => ipcRenderer.invoke('stop-scraping'),
    exportData: (data) => ipcRenderer.invoke('export-data', data),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    exportDataToFolder: (data) => ipcRenderer.invoke('export-data-to-folder', data),
    onScrapingProgress: (callback) => ipcRenderer.on('scraping-progress', (event, data) => callback(data)),
    toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    restartAndInstall: () => ipcRenderer.invoke('restart-and-install'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, data) => callback(data)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (event, data) => callback(data)),
    onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, data) => callback(data)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data))
});