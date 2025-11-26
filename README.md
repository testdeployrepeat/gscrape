# 🗺️ gscrape

A fast, powerful desktop application for scraping business data from Google Maps. Built with Electron and Puppeteer.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## ✨ Features

### 🚀 Dual Scraping Modes
- **Single Mode**: Scrape businesses for one location
- **Bulk Mode**: Process multiple locations via CSV or manual entry

### ⚡ Performance
- **3 Speed Modes**: Normal, Fast, and Ultra-Fast
- Smart scrolling with optimized wait times
- Parallel email extraction

### 📊 Real-Time Tracking
- Live elapsed time display
- Estimated completion time (bulk mode)
- Per-query status updates
- Overall statistics dashboard

### 💾 Data Management
- **Auto-save** results after scraping
- **Full history** with data retention
- **Resume capability** for interrupted sessions
- **Click history items** to view their results
- Export to CSV or JSON formats

### 🎯 Comprehensive Data
- Business name and category
- Address and phone number
- Website links
- Owner information
- Ratings and review counts
- Email addresses (optional)

## 📥 Installation

### Windows
1. Download the latest release: `gscrape Setup 1.0.0.exe`
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

## 🛠️ Building from Source

### Prerequisites
- Node.js 18+ and npm
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/testdeployrepeat/gscrape.git
cd gscrape

# Install dependencies (downloads Chrome automatically)
npm install

# Run in development
npm start

# Build installer
npm run build
```

The installer will be in the `dist/` folder.

## ⚙️ Configuration

### Speed Modes
- **Normal**: Safest, most reliable
- **Fast**: Balanced speed and reliability
- **Ultra-Fast**: Maximum speed (may trigger rate limits)

### Options
- **Extract Websites**: Visit each business page for accurate website links
- **Extract Emails**: Scrape email addresses from business websites
- **Headless Mode**: Run browser in background
- **Auto-save**: Automatically export results after scraping

## 📊 Data Storage

All data is stored persistently in:
```
C:\Users\{YourUsername}\AppData\Roaming\gscrape\data\
```

Your data survives app restarts, updates, and reinstallation.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 💖 Support the Project

If you find this tool helpful, consider supporting its development:

- **PayPal**: [paypal.me/josedeguia](https://paypal.me/josedeguia)
- **Wise**: [wise.com/pay/me/joserobertoquimod](https://wise.com/pay/me/joserobertoquimod)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Please respect Google's Terms of Service and use responsibly. The authors are not responsible for any misuse of this software.

## 📮 Contact

**Rob De Guia** - Creator & Maintainer

- GitHub: [@testdeployrepeat](https://github.com/testdeployrepeat)
- Email: joserobertodeguia@gmail.com

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [Puppeteer](https://pptr.dev/)
- Uses [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)

---

Made with ❤️ by Rob De Guia
