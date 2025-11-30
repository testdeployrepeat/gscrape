const fs = require('fs');
const path = require('path');

// Check if any of the new logo files exist
const lightLogoPath = path.join(__dirname, '..', 'app-logo-lightmode.png');
const darkLogoPath = path.join(__dirname, '..', 'app-logo-darkmode.png');
const desktopIconPath = path.join(__dirname, '..', 'desktop-icon.png');

// Check for desktop icon (which is used for Windows) first
if (fs.existsSync(desktopIconPath)) {
    console.log('✓ Desktop icon found at:', desktopIconPath);
} else if (fs.existsSync(lightLogoPath)) {
    console.log('✓ Light mode app logo found at:', lightLogoPath);
} else if (fs.existsSync(darkLogoPath)) {
    console.log('✓ Dark mode app logo found at:', darkLogoPath);
} else {
    console.error('✗ No app logo found! Please ensure desktop-icon.png, app-logo-lightmode.png, or app-logo-darkmode.png exists in the root directory.');
    process.exit(1);
}
