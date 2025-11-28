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
    toggleDevTools: () => ipcRenderer.invoke('toggle-devtools')
});