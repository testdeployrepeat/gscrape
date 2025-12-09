const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0a0a0a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'app-logo.png')
    });

    mainWindow.loadFile('index.html');

    // Open external links in default browser (for PayPal, Wise, etc.)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Uncomment for debugging
    // mainWindow.webContents.openDevTools();

    // Create custom menu to ensure shortcuts work
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CommandOrControl+0',
                    click: () => {
                        mainWindow.webContents.setZoomLevel(0);
                    }
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CommandOrControl+=',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                    }
                },
                {
                    label: 'Zoom In (Plus)',
                    accelerator: 'CommandOrControl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CommandOrControl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
                    }
                },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Helper function to get the data directory path
// Uses userData directory which persists even when app is packaged as EXE
function getDataPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'data');
}

// Helper function to get sessions directory path
function getSessionsPath() {
    const dataDir = getDataPath();
    return path.join(dataDir, 'sessions');
}

ipcMain.handle('get-history', async () => {
    try {
        const dataDir = getDataPath();
        const historyPath = path.join(dataDir, 'scraped_history.json');
        const data = await fs.readFile(historyPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { searches: [] };
    }
});

ipcMain.handle('clear-history', async () => {
    try {
        const dataDir = getDataPath();
        const historyPath = path.join(dataDir, 'scraped_history.json');

        // 1. Reset history meta file
        await fs.writeFile(historyPath, JSON.stringify({ searches: [] }, null, 2));

        // 2. Clear all session files (delete sessions folder and recreate it)
        const sessionsDir = getSessionsPath();
        try {
            await fs.rm(sessionsDir, { recursive: true, force: true });
            await fs.mkdir(sessionsDir, { recursive: true });
        } catch (err) {
            console.error('Error clearing sessions directory:', err);
            // Don't fail the whole operation if just folder cleanup fails, but log it
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-history', async (event, historyData) => {
    try {
        const dataDir = getDataPath();
        const historyPath = path.join(dataDir, 'scraped_history.json');

        // Ensure data directory exists
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }

        await fs.writeFile(historyPath, JSON.stringify(historyData, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Queue system for file writes to prevent race conditions
const sessionWriteQueues = new Map();

ipcMain.handle('save-session-data', async (event, { sessionId, data }) => {
    // Get or initialize the write queue for this session
    if (!sessionWriteQueues.has(sessionId)) {
        sessionWriteQueues.set(sessionId, Promise.resolve());
    }

    // Chain the new write operation to the existing promise
    const writePromise = sessionWriteQueues.get(sessionId).then(async () => {
        try {
            const sessionsDir = getSessionsPath();
            const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

            // Ensure sessions directory exists
            try {
                await fs.access(sessionsDir);
            } catch {
                await fs.mkdir(sessionsDir, { recursive: true });
            }

            // Using temporary file + rename for atomic write
            const tempPath = `${sessionPath}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
            await fs.rename(tempPath, sessionPath);

            return { success: true, filePath: sessionPath };
        } catch (error) {
            console.error(`Error saving session data for ${sessionId}:`, error);
            return { success: false, error: error.message };
        }
    });

    // Update the queue with the new promise
    sessionWriteQueues.set(sessionId, writePromise);

    // Clean up queue when done (optional, but good for memory)
    writePromise.finally(() => {
        if (sessionWriteQueues.get(sessionId) === writePromise) {
            sessionWriteQueues.delete(sessionId);
        }
    });

    return writePromise;
});

ipcMain.handle('get-session-data', async (event, sessionId) => {
    try {
        const sessionsDir = getSessionsPath();
        const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

        // Check if file exists first
        try {
            await fs.access(sessionPath);
        } catch {
            // If file doesn't exist, return null so renderer knows it failed/is empty
            return null;
        }

        const data = await fs.readFile(sessionPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading session data:', error);
        return null;
    }
});

ipcMain.handle('delete-session-data', async (event, sessionId) => {
    try {
        const sessionsDir = getSessionsPath();
        const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

        await fs.unlink(sessionPath);
        return { success: true };
    } catch (error) {
        // Ignroe error if file doesn't exist
        return { success: false, error: error.message };
    }
});

const { scrapeGoogleMaps, stopScraping, resetStopper } = require('./scraper');

ipcMain.handle('start-scraping', async (event, options) => {
    try {
        const results = await scrapeGoogleMaps(options, (progress) => {
            mainWindow.webContents.send('scraping-progress', progress);
        });
        return { success: true, data: results };
    } catch (error) {
        if (error.message.includes('cancelled') || error.message.includes('stopped')) {
            return { success: false, stopped: true, error: error.message };
        }
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-scraping', async () => {
    try {
        stopScraping();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('reset-scraping-state', async () => {
    try {
        resetStopper();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('toggle-devtools', async () => {
    if (mainWindow) {
        mainWindow.webContents.toggleDevTools();
    }
    return { success: true };
});

// Helper function to generate file content based on format
function generateFileContent(data, format) {
    if (format === 'json') {
        return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
        if (data.length === 0) {
            return '';
        } else {
            const headers = Object.keys(data[0]);
            const csvRows = [headers.join(',')];

            for (const row of data) {
                const values = headers.map(header => {
                    const value = row[header] || '';
                    const escaped = ('' + value).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            }

            return csvRows.join('\n');
        }
    }
    return '';
}

ipcMain.handle('export-data', async (event, { data, format, filename }) => {
    try {
        // Show save dialog
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: filename,
            filters: [
                { name: format.toUpperCase(), extensions: [format] }
            ]
        });

        if (!result.filePath) return { success: false, cancelled: true };
        let filePath = result.filePath;

        const content = generateFileContent(data, format);

        await fs.writeFile(filePath, content, 'utf8');
        return { success: true, filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-folder', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });

        if (!filePaths || filePaths.length === 0) {
            return { success: false, cancelled: true };
        }

        return { success: true, filePath: filePaths[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Export data to a specific folder
ipcMain.handle('export-data-to-folder', async (event, { data, format, filename, folderPath }) => {
    try {
        const filePath = path.join(folderPath, filename);

        const content = generateFileContent(data, format);

        await fs.writeFile(filePath, content, 'utf8');
        return { success: true, filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Auto-update functionality
autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    mainWindow.webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-error', { error: err.message });
});

autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-downloaded', info);
});

ipcMain.handle('check-for-updates', async () => {
    try {
        await autoUpdater.checkForUpdates();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('restart-and-install', async () => {
    autoUpdater.quitAndInstall();
    return { success: true };
});

// Check for updates on startup (with a delay to let the app load first)
setTimeout(() => {
    if (app.isPackaged) { // Only check for updates when packaged, not during development
        autoUpdater.checkForUpdates();
    }
}, 10000); // Check for updates after 10 seconds
