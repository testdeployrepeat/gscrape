# 🗺️ gscrape

A fast, powerful desktop application for scraping business data from Google Maps. Built with Electron and Puppeteer.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## 🆕 What's New (v1.1.0)
- Major UI update
- Updated package.json version
- Minor bug fixes and improvements

## 📥 Installation / Download

### Windows
1. Download the latest release: [GScrape v1.1.0.exe](https://github.com/testdeployrepeat/gscrape/releases/download/v1.1.0/gscrape.Setup.1.1.0.exe)
2. Run the installer
3. Launch from Desktop or Start Menu

> **Note**: Windows may show a security warning. Click "More info" → "Run anyway"

> **✅ Chrome Bundled**: No Chrome installation required!

### macOS/Linux
Run from source:
```bash
git clone https://github.com/testdeployrepeat/gscrape.git
cd gscrape
npm install
npm start
```
---

## ⚠️ Disclaimer

**GScrape is intended for educational and personal use only.**  

- Users must comply with **Google Maps' Terms of Service**.  
- The author is **not responsible** for any misuse of this software.  
- Use this tool responsibly and at your own risk.  

---
## ✨ Features

- **Dual Modes**: Single location or bulk CSV processing
- **3 Speed Modes**: Normal, Fast, Ultra-Fast
- **Real-Time Tracking**: Live progress, elapsed time, statistics
- **Full History**: Auto-save with resume capability
- **Comprehensive Data**: Name, address, phone, website, email, owner, ratings

### Data Extracted
- Business name and category
- Address and phone number
- Website links and email addresses
- Owner information
- Ratings and review counts

## 🛠️ Building from Source

### Prerequisites
- Node.js 18+ and npm
- Git

### Setup
```bash
git clone https://github.com/testdeployrepeat/gscrape.git
cd gscrape
npm install    # Downloads Chrome automatically
npm start      # Run in development
npm run build  # Build installer (output in dist/)
```

## ⚙️ Configuration

### Speed Modes
- **Normal**: Safest, most reliable
- **Fast**: Balanced speed and reliability
- **Ultra-Fast**: Maximum speed (may trigger rate limits)

### Options
- **Extract Websites**: Visit each business page for accurate links
- **Extract Emails**: Scrape email addresses from websites
- **Headless Mode**: Run browser in background
- **Auto-save**: Automatically export results

## 📊 Data Storage

All data is stored persistently in:
```
C:\Users\{YourUsername}\AppData\Roaming\gscrape\data\
```

Your data survives app restarts, updates, and reinstallation.

## 💖 Support the Project

If you find this tool helpful:
- **PayPal**: [paypal.me/josedeguia](https://paypal.me/josedeguia)
- **Wise**: [wise.com/pay/me/joserobertoquimod](https://wise.com/pay/me/joserobertoquimod)

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Please respect Google's Terms of Service and use responsibly.

## 📮 Contact

**Rob De Guia** - Creator & Maintainer
- GitHub: [@testdeployrepeat](https://github.com/testdeployrepeat)
- Email: joserobertodeguia@gmail.com

---

Made with ❤️ by Rob De Guia
