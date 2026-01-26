# Text Extractor Chrome Extension
⚠️ DEPRECATED

This repository is no longer maintained.

The project was rebuilt from scratch.
👉 Active version: https://github.com/YOUR_USERNAME/finpay

A Chrome extension that enables users to extract text from images and selected areas on any webpage using OCR (Optical Character Recognition) technology.

## Features

- **Image Text Extraction**: Extract text from images displayed on web pages using OCR
- **Area Selection**: Select specific areas on a webpage to extract text
- **Multi-language Support**: Supports English, Spanish, and French
- **Text Review & Editing**: Review and edit extracted text before copying
- **One-Click Copy**: Copy extracted text to clipboard with a single click
- **Easy Activation**: Simple extension icon click to activate selection mode

## Installation

### From Source (Development)

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the extension directory

### From Chrome Web Store

*(Coming soon - extension will be available on Chrome Web Store)*

## Usage

### Basic Usage

1. **Activate Selection Mode**: Click the Text Extractor icon in your Chrome toolbar
2. **Select Area**: Click and drag to select a rectangular area on any webpage
3. **Extract Text**: The extension automatically extracts text from the selected area
4. **Review & Edit**: Use the popup to review, edit, and copy the extracted text

### Detailed Steps

#### Step 1: Activate Selection Mode
- Click the Text Extractor icon in your Chrome toolbar
- The icon will show "ON" when selection mode is active
- Your cursor will change to a crosshair

#### Step 2: Select Content
- Click and drag to create a selection rectangle
- The selected area will be highlighted with a blue border
- Selection works on any website content (text, images, mixed content)

#### Step 3: Text Extraction
- Release the mouse to complete selection
- A loading indicator appears while text is extracted
- The popup automatically opens with extracted results

#### Step 4: Review and Copy
- **View Text**: See extracted text in the display area
- **Edit Text**: Click "Edit" to modify the text if needed
- **Copy Text**: Click "Copy" to copy text to clipboard
- **View Details**: Click "Details" to see extraction metadata

### Tips and Shortcuts

- **Cancel Selection**: Press `ESC` or click outside the selection area
- **Keyboard Navigation**: Use `Tab` to navigate popup controls
- **Close Popup**: Click the "X" button or press `ESC`
- **Edit Mode**: Toggle between display and edit modes
- **Works Everywhere**: Extension functions on any website

### Advanced Features

#### Language Support
The extension supports OCR in multiple languages:
- English (default)
- Spanish
- French
- Additional languages can be configured

#### Text Sources
The extension extracts text from:
- **Selectable Text**: Regular webpage text
- **Images**: Text within images using OCR
- **Mixed Content**: Both text and images in the same selection

#### Error Handling
- Clear error messages for failed extractions
- Graceful fallbacks when OCR is unavailable
- Options to retry or manually edit text

## Development

### Project Structure

```
.
├── background/          # Background service worker
├── content/            # Content scripts for webpage interaction
├── popup/              # Popup UI components
├── lib/                # OCR processing module
├── utils/              # Utility functions
├── icons/              # Extension icons
├── manifest.json       # Chrome extension manifest
└── package.json        # Project dependencies
```

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Load extension in Chrome (see Installation section above)

3. Make changes to the code

4. Reload the extension in `chrome://extensions/` to see changes

### Testing

Run tests with:
```bash
npm test
```

### Building

No build step is required for this extension. The extension runs directly from source files.

## Technologies Used

- **Chrome Extension Manifest V3**: Latest Chrome extension standard
- **Tesseract.js**: Client-side OCR library for text extraction
- **JavaScript (ES6+)**: Modern JavaScript features
- **HTML/CSS**: Popup UI and styling

## Requirements

- Google Chrome (latest version)
- Node.js and npm (for development)

## Permissions

This extension requires the following permissions:
- `activeTab`: To access the current tab's content
- `storage`: To store extension settings (if needed)
- `clipboardWrite`: To copy text to clipboard
- `scripting`: To inject content scripts

## License

MIT License - See LICENSE file for details

## Contributing

This is an open-source project. Contributions are welcome!

## Troubleshooting

### Common Issues

#### Extension Not Working / Site Malfunctions
1. **Check Permissions**: Ensure the extension has the required permissions in `chrome://extensions/`
2. **Reload Extension**: Click the reload button in `chrome://extensions/`
3. **Restart Browser**: Close and reopen Chrome
4. **Check Console**: Open DevTools and check for error messages
5. **Clear Cache**: Clear browser cache and reload the extension

#### Selection Mode Issues (Plus Symbol Appears But Selection Doesn't Work)
- **Wait for Activation**: Wait 1-2 seconds after clicking the extension icon for it to fully activate
- **Check Page Load**: Ensure the webpage has fully loaded before trying to select
- **Avoid Interactive Elements**: Don't start selections on buttons, links, or form elements
- **Reload Extension**: The extension may need to be reloaded if it's in a bad state

#### Site Malfunctions When Selecting
- **Extension Conflict**: Try disabling other extensions temporarily
- **Page Reload**: Reload the webpage and try again
- **Selection Size**: Make sure your selection is at least 5x5 pixels
- **Check Console**: Look for JavaScript errors in DevTools

#### No Text Extracted
- **Empty Selection**: Make sure you've selected content (minimum 5x5 pixels)
- **Image Quality**: Low-quality images may not extract well
- **Language Mismatch**: Ensure the correct language is selected for OCR
- **Browser Compatibility**: Use the latest version of Chrome

#### OCR Not Working
- **Network Issues**: OCR requires internet for initial model download
- **Memory Limits**: Large images may cause processing failures
- **Browser Restrictions**: Some websites block extension scripts
- **Tesseract.js**: Make sure the OCR library loaded properly

#### Copy Not Working
- **Clipboard Permissions**: Grant clipboard permissions if prompted
- **Browser Settings**: Check if clipboard access is blocked
- **Empty Text**: Ensure there's text to copy

### Performance Tips

- **Smaller Selections**: Select smaller areas for faster processing
- **Image Quality**: Higher quality images extract better but process slower
- **Language Selection**: Use specific languages instead of "All Languages" for faster OCR

### Debug Mode

To enable debug logging:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click the extension's background page link
4. Check the Console tab for detailed logs

#### Content Script Debugging
To debug content script issues:
1. Open the webpage where the extension isn't working
2. Open DevTools (F12)
3. Go to Console tab
4. Look for messages starting with `[TextExtractor]` or extension-related errors
5. Check if selection overlay appears when clicking the extension icon

#### Common Debug Messages
- `"Selection overlay content script loaded"` - Content script is working
- `"Selection mode activated"` - Extension icon was clicked successfully
- `"Selection started at: X, Y"` - Mouse selection began
- `"Selection completed"` - User finished selecting an area
- `"Text extraction completed"` - OCR processing finished

### Reset Extension

To reset all settings:
1. Go to `chrome://extensions/`
2. Remove the extension
3. Reinstall from the source files
4. All stored preferences will be cleared

## Support

For issues, questions, or feature requests, please:

1. Check the troubleshooting section above
2. Enable debug logging and check for error messages
3. Test on a simple webpage first
4. Report issues with:
   - Chrome version
   - Website URL (if specific)
   - Steps to reproduce
   - Error messages from console

## Version

Current version: 1.0.0

---

**Privacy Note**: This extension processes all OCR operations client-side for privacy. No data is sent to external servers. Text extraction happens entirely in your browser.
