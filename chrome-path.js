const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Gets the path to the bundled Chrome executable
 * Works both in development and production (packaged app)
 */
function getChromePath() {
    let chromePath;

    if (app.isPackaged) {
        // In production, Chrome is in the resources folder
        const resourcesPath = process.resourcesPath;
        chromePath = path.join(resourcesPath, 'chrome');
    } else {
        // In development, Chrome is in the project root
        chromePath = path.join(__dirname, 'chrome');
    }

    // Find the Chrome executable
    const chromeExecutable = findChromeExecutable(chromePath);

    if (!chromeExecutable) {
        throw new Error(`Chrome executable not found in: ${chromePath}`);
    }

    return chromeExecutable;
}

/**
 * Recursively searches for Chrome executable
 */
function findChromeExecutable(dir) {
    if (!fs.existsSync(dir)) {
        return null;
    }

    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            const found = findChromeExecutable(fullPath);
            if (found) return found;
        } else if (file.name === 'chrome.exe' || file.name === 'chrome') {
            return fullPath;
        }
    }

    return null;
}

module.exports = { getChromePath };
