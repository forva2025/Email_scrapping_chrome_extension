# Email Scraping Chrome Extension

A powerful Chrome extension designed to extract and collect email addresses from web pages efficiently and ethically. This tool helps users gather contact information for research, marketing, or networking purposes while respecting website terms of service and privacy regulations.

## Features

- **Smart Email Detection**: Automatically identifies and extracts email addresses from web page content
- **Bulk Collection**: Gather multiple email addresses from a single page or across multiple pages
- **Duplicate Prevention**: Intelligent filtering to avoid duplicate email addresses
- **Export Options**: Export collected emails in multiple formats (CSV, JSON, TXT)
- **Privacy Focused**: Respects user privacy and website terms of service
- **User-Friendly Interface**: Simple popup interface for easy access and control
- **Real-time Processing**: Instant email extraction as you browse

## Installation

### For Users (Installing the Extension)

1. **Download the Extension**
   - Clone or download this repository
   - Ensure all files are in the `Email_scrapping_chrome_extension/` directory

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" button
   - Select the `Email_scrapping_chrome_extension/` folder
   - The extension should now appear in your extensions list

3. **Verify Installation**
   - Look for the extension icon in your Chrome toolbar
   - Click the icon to open the extension popup

### For Developers (Setting up Development Environment)

1. **Prerequisites**
   - Google Chrome browser
   - Basic knowledge of JavaScript and Chrome Extension APIs
   - Text editor (VS Code recommended)

2. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd Email_scrapping_chrome_extension
   ```

3. **Development Setup**
   - Make changes to the source files
   - Reload the extension in `chrome://extensions/` after changes
   - Use Chrome DevTools for debugging

## Usage

### Basic Usage

1. **Navigate to a webpage** containing email addresses
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Extract Emails"** in the popup
4. **View collected emails** in the extension interface
5. **Export the results** using the export button

### Advanced Features

- **Multi-page Collection**: Visit multiple pages and collect emails from all of them
- **Filter Options**: Apply filters to collect only specific types of email addresses
- **Batch Export**: Export all collected emails at once

### Keyboard Shortcuts

- `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac): Quick extract emails from current page

## Project Structure

```
Email_scrapping_chrome_extension/
├── manifest.json          # Chrome extension manifest file
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality and event handlers
├── content.js            # Content script for web page interaction
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

### File Descriptions

- **`manifest.json`**: Defines the extension's permissions, scripts, and metadata
- **`popup.html`**: HTML structure for the extension's popup interface
- **`popup.js`**: JavaScript logic for popup interactions and data management
- **`content.js`**: Script that runs on web pages to extract email addresses
- **`LICENSE`**: MIT License terms and conditions

## Development Setup

### Prerequisites

- Node.js (for development tools)
- Chrome browser
- Git (for version control)

### Development Workflow

1. **Make Changes**
   - Edit the source files in your preferred text editor
   - Test changes by reloading the extension

2. **Testing**
   - Load the extension in Chrome developer mode
   - Test on various websites with different email formats
   - Verify export functionality works correctly

3. **Debugging**
   - Use Chrome DevTools to inspect the extension
   - Check the console for error messages
   - Use breakpoints in the content script

### Building for Production

1. **Minify JavaScript files** (optional)
2. **Test thoroughly** on different websites
3. **Package the extension** for distribution
4. **Create release notes** for version updates

## Contributing

We welcome contributions to improve the Email Scraping Chrome Extension! Here's how you can help:

### Ways to Contribute

- **Bug Reports**: Report issues you've found
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit pull requests with fixes or enhancements
- **Documentation**: Help improve this README or add documentation

### Development Guidelines

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following the existing code style
4. **Test thoroughly** before submitting
5. **Submit a pull request** with a clear description

### Code Style

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Follow JavaScript best practices
- Test on multiple websites and scenarios

## Privacy and Ethics

This extension is designed with privacy and ethics in mind:

- **No Data Collection**: The extension does not collect or transmit user data
- **Local Processing**: All email extraction happens locally in the browser
- **Respect Terms of Service**: Users should respect website terms when using this tool
- **Legal Compliance**: Ensure compliance with local laws regarding data collection

## Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure all files are in the correct directory structure
- Check that manifest.json is valid JSON
- Try reloading the extension in chrome://extensions/

**Emails not being detected:**
- Check if emails are visible in the page source
- Some websites may obfuscate email addresses
- Try refreshing the page and extracting again

**Export not working:**
- Ensure you have write permissions for the download directory
- Check browser security settings
- Try different export formats

### Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Search existing issues on the repository
3. Create a new issue with detailed information
4. Include your browser version and steps to reproduce

## Security

For information about security measures, best practices, and how to report security issues, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**OCHIRIA ELIAS ONYAIT**
- Email: [Contact information not provided]
- GitHub: [GitHub profile not provided]

## Version History

- **v0.1.0** (Current)
  - Initial release
  - Basic email extraction functionality
  - Simple popup interface

## Roadmap

- [ ] Advanced email filtering options
- [ ] Integration with email clients
- [ ] Bulk email validation
- [ ] Cloud synchronization
- [ ] Mobile browser support

---

**Disclaimer**: This tool is for educational and legitimate business purposes only. Users are responsible for complying with applicable laws and website terms of service when collecting email addresses.