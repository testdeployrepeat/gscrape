const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

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
        await fs.writeFile(historyPath, JSON.stringify({ searches: [] }, null, 2));
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

const { scrapeGoogleMaps, stopScraping } = require('./scraper');

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
