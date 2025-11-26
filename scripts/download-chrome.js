const { install } = require('@puppeteer/browsers');
const path = require('path');
const fs = require('fs');

async function downloadChrome() {
    const chromeDir = path.join(__dirname, '..', 'chrome');

    // Check if Chrome is already downloaded
    if (fs.existsSync(chromeDir) && fs.readdirSync(chromeDir).length > 0) {
        console.log('Chrome already downloaded, skipping...');
        return;
    }

    console.log('Downloading Chrome for Puppeteer...');

    try {
        const browser = await install({
            cacheDir: chromeDir,
            browser: 'chrome',
            buildId: '142.0.7444.59', // Match the version from the error
        });

        console.log('Chrome downloaded successfully to:', browser.executablePath);
    } catch (error) {
        console.error('Failed to download Chrome:', error);
        process.exit(1);
    }
}

downloadChrome();
