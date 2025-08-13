# Better Text Chrome Extension

A Chrome extension that translates selected text using AI (DeepSeek or OpenAI) when you double-click on any text on a webpage.

## Features

- Double-click any text on a webpage to select and translate it
- Support for DeepSeek and OpenAI translation APIs
- Displays original text and translation in a stylish popup
- Translation caching to reduce API calls
- Auto-detect source language
- Support for 13+ target languages
- Easy-to-close popup (click X, press Escape, or click outside)
- Clean and modern UI with gradient header
- Works on all websites

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `better-text-chrome-extension` folder
5. The extension will be installed and ready to use

## Setup

### First-time Configuration

1. Click on the extension icon in Chrome toolbar
2. You'll see the settings page where you need to:
   - Select your API provider (DeepSeek or OpenAI)
   - Enter your API key
   - Select the AI model
   - Choose your target language
3. Click "Save Settings"
4. Click "Test Connection" to verify your API setup

### Getting API Keys

#### DeepSeek
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into the extension settings

#### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste it into the extension settings

## Usage

1. Navigate to any webpage
2. Double-click on any text to select it
3. The selected text and its translation will appear in a popup
4. The popup shows:
   - Original text in blue section
   - Translation in green section
   - Loading indicator while translating
   - Cache indicator for cached translations
5. Close the popup by:
   - Clicking the X button
   - Pressing the Escape key
   - Clicking anywhere outside the popup

## Settings

Access settings by clicking the extension icon:

- **API Provider**: Choose between DeepSeek or OpenAI
- **API Key**: Your API key (stored locally)
- **Model**: Select AI model for translation
- **Target Language**: Language to translate into
- **Auto-detect source language**: Automatically detect the source language
- **Cache translations**: Store translations to reduce API calls

## Files Structure

- `manifest.json` - Extension configuration
- `content.js` - Handles double-click detection and popup creation
- `background.js` - Service worker for API calls and translation
- `popup.css` - Styles for the translation popup
- `options.html` - Settings page HTML
- `options.js` - Settings page logic
- `options.css` - Settings page styles
- `icon-*.png` - Extension icons

## Privacy & Security

- API keys are stored locally using `chrome.storage.local`
- Keys are never shared or sent anywhere except to your chosen API provider
- Translation cache is stored locally to reduce API calls
- No user data is collected or transmitted by the extension itself

## Troubleshooting

- **"Please configure API settings first"**: Click extension icon and set up your API key
- **Translation fails**: Check your API key is valid and has credits
- **Slow translations**: First translation may be slower; subsequent ones use cache
- **Cache issues**: Click "Clear Cache" in settings to reset