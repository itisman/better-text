# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that provides instant text translation via AI APIs (DeepSeek or OpenAI). Users double-click any text on a webpage to get translations in a popup.

## Architecture

### Core Components

1. **Content Script** (`content.js`): Injected into all web pages, handles double-click detection and popup UI creation
2. **Service Worker** (`background.js`): Manages API calls, translation requests, and caching logic
3. **Options Page** (`options.html/js/css`): Configuration interface for API settings and preferences
4. **Popup Styles** (`popup.css`): Injected into pages for translation popup styling

### Message Flow

1. User double-clicks text → `content.js` detects selection
2. Content script sends message to service worker via `chrome.runtime.sendMessage`
3. Service worker processes translation request (checks cache, calls API)
4. Response flows back to content script → Updates popup UI

## Development Commands

```bash
# Install dependencies (for icon generation only)
npm install

# Generate extension icons from HTML canvas
npm run generate-icons

# Load extension in Chrome
# 1. Navigate to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this directory
```

## Testing the Extension

1. **API Configuration**: Click extension icon → Enter API credentials → Test Connection
2. **Translation Testing**: Navigate to any webpage → Double-click text → Verify popup appears
3. **Cache Verification**: Translate same text twice → Second translation should show "(cached)"

## Chrome Extension Manifest V3 Specifics

- Service workers replace background pages (no persistent background context)
- Content scripts inject into all URLs via `"matches": ["<all_urls>"]"`
- Uses `chrome.storage.local` for settings persistence
- Implements proper message passing between content scripts and service worker

## Translation API Integration

The extension supports two providers with different endpoints:
- **DeepSeek**: `https://api.deepseek.com/v1/chat/completions`
- **OpenAI**: `https://api.openai.com/v1/chat/completions`

Both use similar request formats but may have provider-specific model names and response handling.

## Caching Strategy

- Translations cached in-memory in service worker with key format: `${text}_${targetLanguage}`
- Cache persisted to `chrome.storage.local` with max 100 entries (FIFO eviction)
- Cache can be disabled via settings or cleared manually

## Chrome Storage Keys

- `apiProvider`: 'deepseek' or 'openai'
- `apiKey`: Encrypted API key string
- `model`: Model identifier (provider-specific)
- `targetLanguage`: ISO language code (default: 'zh-CN')
- `autoDetectLanguage`: Boolean flag
- `cacheTranslations`: Boolean flag
- `translationCache`: Object with translation history
- `lastSelectedText`: Most recent selection