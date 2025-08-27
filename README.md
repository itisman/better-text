# Better Text Chrome Extension

A Chrome extension that provides instant text translation and AI-powered text rewriting using DeepSeek or OpenAI APIs. Double-click or Ctrl+click any text on a webpage to translate it, or use the dedicated rewriter interface to improve your text.

## Features

### Translation Features
- Double-click or Ctrl+click any text on a webpage to translate it instantly
- Support for DeepSeek and OpenAI translation APIs
- Custom API base URL support for proxy servers or self-hosted models
- Displays original text and translation in a stylish popup
- Current AI model indicator shown in top-right corner
- Translation caching to reduce API calls
- Auto-detect source language
- Support for 13+ target languages
- Easy-to-close popup (click X, press Escape, or click outside)

### AI Text Rewriter
- Dedicated interface for improving and rewriting text
- Platform-specific modes (Outlook/Teams) for context-aware suggestions
- Multiple language support (English/Chinese)
- Real-time AI model display
- Generate multiple rewriting suggestions
- Clean and modern UI with gradient headers

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

### Text Translation
1. Navigate to any webpage
2. Double-click or Ctrl+click on any text to select it
3. The selected text and its translation will appear in a popup
4. The popup shows:
   - Current AI model in the top-right corner
   - Original text in blue section
   - Translation in green section
   - Loading indicator while translating
   - Cache indicator for cached translations
5. Close the popup by:
   - Clicking the X button
   - Pressing the Escape key
   - Clicking anywhere outside the popup

### AI Text Rewriter
1. Click the extension icon to open settings
2. Click "Go to AI Rewriter →" link
3. Select platform mode (Outlook or Teams)
4. Choose language (English or Chinese)
5. Enter or paste your text
6. Click "Rewrite" to get AI-powered suggestions
7. Copy and use the improved text

## Settings

Access settings by clicking the extension icon:

- **API Provider**: Choose between DeepSeek or OpenAI
- **API Key**: Your API key (stored locally)
- **API Base URL**: Custom API endpoint (optional) - for proxy servers or self-hosted models
- **Model**: Select AI model for translation and rewriting
- **Target Language**: Language to translate into
- **Auto-detect source language**: Automatically detect the source language
- **Cache translations**: Store translations to reduce API calls
- **Navigation**: Quick links to AI Rewriter interface

## Files Structure

- `manifest.json` - Extension configuration
- `content.js` - Handles double-click/Ctrl+click detection, popup creation, model display
- `background.js` - Service worker for API calls, translation, and rewriting
- `popup.css` - Styles for the translation popup and model indicator
- `options.html` - Settings page HTML with API configuration
- `options.js` - Settings page logic including base URL support
- `options.css` - Settings page styles
- `rewriter.html` - AI text rewriter interface
- `rewriter.js` - Rewriter page logic and API integration
- `rewriter.css` - Rewriter page styles
- `icon-*.png` - Extension icons

## Privacy & Security

- API keys are stored locally using `chrome.storage.local`
- Keys are never shared or sent anywhere except to your chosen API provider
- Translation cache is stored locally to reduce API calls
- No user data is collected or transmitted by the extension itself

## Troubleshooting

- **"Please configure API settings first"**: Click extension icon and set up your API key
- **Translation fails**: Check your API key is valid and has credits
- **Model not showing**: Ensure you have selected a model in settings
- **Custom API not working**: Verify base URL format (should include protocol like https://)
- **Rewriter not responding**: Check API configuration and model selection
- **Slow translations**: First translation may be slower; subsequent ones use cache
- **Cache issues**: Click "Clear Cache" in settings to reset
- **Connection test fails**: Verify API key, base URL (if custom), and network connectivity