# GScrape

Fastest open-source desktop application for scraping business data from Google Maps.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.5.0-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)

## 🆕 What's New in v4.4.0

### Major Updates
- **Complete UI Overhaul** - Modern, intuitive interface with improved navigation
- **Optimized Scraping Engine** - 100% faster and more reliable data extraction
- **Bulk Sessions Manager** - Track and manage multiple bulk scraping operations
- **One-Click Copy** - Copy live results immediately in table or JSON format
- **Export Option** - Combine multiple files or export separate queries in a bulk session.
- **Customizable Fast Mode** - Fine-tune parallel scraping for your device's performance
- **Enhanced Detail Extraction** - Retrieves hidden company details in restricted regions such as EU countries
- **macOS Support** - Native builds now available for macOS (Intel & Apple Silicon)
- **Webhook Integration** - Send scraped data to external platforms via POST requests

---

## 📥 Installation

### Windows
1. Download: [gscrape v4.0.0 Setup.exe](https://github.com/testdeployrepeat/gscrape/releases/latest)
2. Run the installer
3. Follow the setup wizard
4. Launch from Desktop or Start Menu

**Installation Location:**
```
C:\Users\{Username}\AppData\Local\Programs\gscrape\
```

**Data Storage:**
```
C:\Users\{Username}\AppData\Roaming\gscrape\data\
```


### macOS
1. Download: [gscrape-4.0.0.dmg](https://github.com/testdeployrepeat/gscrape/releases/latest)
   - **Intel Macs**: `gscrape-4.0.0.dmg`
   - **Apple Silicon (M1/M2/M3)**: `gscrape-4.0.0-arm64.dmg`
2. Open the DMG file
3. Drag gscrape to Applications folder
4. Launch from Applications

**Installation Location:**
```
/Applications/gscrape.app
```

**Data Storage:**
```
~/Library/Application Support/gscrape/data/
```


> **⚠️ macOS Troubleshooting**: If you encounter errors during scraping, install [Google Chrome](https://www.google.com/chrome/) from the official website. The app should work normally after Chrome installation.

---

## ✨ Features

### Core Capabilities
- 🎯 **Dual Scraping Modes**
  - **Single Mode**: Scrape one location at a time
  - **Bulk Mode**: Process hundreds of locations with one click

- ⚡ **Flexible Speed Settings**
  - **Normal Mode**: Safest, most reliable (sequential scraping)
  - **Fast Mode**: Customizable parallel processing

- 📊 **Real-Time Monitoring**
  - Live progress tracking
  - Elapsed time counter
  - Statistics dashboard (companies, websites, phones, emails found)
  - Scrollable live results viewer

- 💾 **Advanced Data Management**
  - Auto-save with full history
  - Resume paused scraping sessions
  - Bulk session tracking and management
  - Export as CSV or JSON
  - One-click copy to clipboard (table or JSON format)

- 🔗 **Integration Options**
  - **POST to Webhook**: Send data to external platforms (n8n, Make.com, Zapier, etc.)
  - Custom webhook URL configuration

### Data Extracted

**Basic Information:**
- ✅ Business name and category
- ✅ Full address
- ✅ Phone number
- ✅ Website URL
- ✅ Ratings (1-5 stars)
- ✅ Review count
- ✅ Email addresses (when enabled)

**Advanced Extraction:**
- 🔍 **Email Addresses** - Scrapes contact emails from business websites
- 🔍 **Detailed Info Extraction** - For regions where Google Maps hides details:
  - Retrieves hidden phone numbers
  - Extracts obscured website links

---

## ⚙️ Settings & Configuration

### Scraping Settings
- **Headless Mode**: Run browser in background (ON by default)
- **Developer Mode**: Enable F12 DevTools access
- **Fast Mode Parallel Scraping**: Set concurrent queries (1-10) for bulk mode
- **Fast Mode Email Scraping**: Set concurrent websites (1-10) for email extraction

> **Configure fast mode in the settings** - Optimize based on your device's RAM and CPU

### Data Management
- **Default Export Format**: CSV or JSON
- **Webhook URL**: Configure POST endpoint for data integration

### Theme
- **Light Mode**: Clean, bright interface
- **Dark Mode**: Easy on the eyes for extended use

---

## 📊 Data Export Options

### Export Formats
1. **CSV** - Import to Excel, Google Sheets, CRM systems
2. **JSON** - Use in APIs, databases, automation workflows

### Export Methods
- **Export Button**: Save to file
- **Copy Button**: Copy to clipboard (as formatted table or JSON)
- **POST Button**: Send directly to webhook endpoint

### Bulk Export
- Export all selected sessions at once
- Combine multiple results into single file
- Export as separate files per session

---

## � Building from Source

### Prerequisites
- Node.js 18+ and npm
- Git

### Development Setup
```bash
# Clone repository
git clone https://github.com/testdeployrepeat/gscrape.git
cd gscrape

# Install dependencies (auto-downloads Chrome)
npm install

# Run in development mode
npm start
```

### Build Installers
```bash
# Build for current platform
npm run build

# Output location: dist/
# Windows: gscrape Setup X.X.X.exe
# macOS: gscrape-X.X.X.dmg
```

---

## 🔄 Auto-Updates

gscrape includes automatic update functionality:

- **Check on Startup**: Checks for updates 10 seconds after launch
- **Background Download**: Downloads updates silently
- **One-Click Install**: Restart to apply updates
- **Preserves Data**: Your scraping history and settings remain intact

Updates are distributed via [GitHub Releases](https://github.com/testdeployrepeat/gscrape/releases).

---

## 🗑️ Uninstallation

### Windows
1. Settings → Apps → gscrape → Uninstall
2. Automatically removes all data including:
   - Installation files
   - Application data (`%APPDATA%\gscrape`)
   - Local data (`%LOCALAPPDATA%\gscrape`)
   - Update cache

### macOS
1. Drag gscrape from Applications to Trash
2. Manually remove data (optional):
```bash
rm -rf ~/Library/Application\ Support/gscrape
rm -rf ~/Library/Caches/gscrape
rm -f ~/Library/Preferences/com.gscrape.app.plist
```

---

## ⚠️ Disclaimer

**gscrape is intended for educational and personal use only.**

- ✅ Users must comply with **Google Maps' Terms of Service**
- ✅ Respect rate limits and scraping best practices
- ❌ The author is **not responsible** for any misuse
- ⚖️ Use this tool responsibly and at your own risk

---

## 🐛 Troubleshooting

### Common Issues

**"Chrome executable not found"**
- Reinstall the application
- Chrome is bundled automatically
- Download Chrome from the official website (if nothing worked)

**Scraping stops or freezes**
- Reduce Fast Mode settings (lower parallel count)
- Switch to Normal mode
- Check internet connection

**No results found**
- Use more specific locations
- Try different search prepositions (in, near, around or custom)
- Verify the business type exists in that area

**Can't find data folder**
- Windows: Press `Win + R`, type `%APPDATA%`, press Enter, find all gscrape folders from there.
- macOS: Finder → Go → Go to Folder → `~/Library/Application Support/gscrape`

---

## 📮 Contact & Support

**Rob De Guia** - Creator & Maintainer

- 🐙 GitHub: [@testdeployrepeat](https://github.com/testdeployrepeat)
- 📧 Email: joserobertodeguia@gmail.com
- 💼 LinkedIn: [joserobertodeguia](https://www.linkedin.com/in/joserobertodeguia)
- 🐦 Twitter: [@robydeguia](https://x.com/robydeguia)

**Hire Me**: Developer | GHL | n8n | Make.com | Automation Specialist

---

## 💖 Support the Project

If you find gscrape useful, consider supporting its development:

- **PayPal**: [paypal.me/josedeguia](https://paypal.me/josedeguia)
- **Wise**: [wise.com/pay/me/joserobertoquimod](https://wise.com/pay/me/joserobertoquimod)

Your support helps maintain and improve gscrape!

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔮 Roadmap

- [ ] Proxy support for enhanced privacy
- [ ] Additional export formats (Excel, SQLite)
- [ ] Scheduled scraping automation
- [ ] Linux builds

---

Made with ❤️ by Rob De Guia
