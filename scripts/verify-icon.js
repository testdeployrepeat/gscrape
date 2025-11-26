const fs = require('fs');
const path = require('path');

// Check if app-logo.png exists
const logoPath = path.join(__dirname, '..', 'app-logo.png');

if (fs.existsSync(logoPath)) {
    console.log('✓ App logo found at:', logoPath);
    console.log('✓ Electron-builder will automatically convert PNG to ICO for Windows');
} else {
    console.error('✗ App logo not found! Please ensure app-logo.png exists in the root directory.');
    process.exit(1);
}
