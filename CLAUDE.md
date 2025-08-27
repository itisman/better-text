# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that provides instant text translation and rewriting via AI APIs (DeepSeek or OpenAI). Users can double-click or Ctrl+click any text on a webpage to get translations in a popup, and access a dedicated AI Text Rewriter interface for improving text.

## Architecture

### Core Components

1. **Content Script** (`content.js`): Injected into all web pages, handles double-click/Ctrl+click detection, popup UI creation, and displays current model info
2. **Service Worker** (`background.js`): Manages API calls for both translation and rewriting requests, caching logic, and custom base URL support
3. **Options Page** (`options.html/js/css`): Configuration interface for API settings, custom base URLs, and preferences
4. **Rewriter Page** (`rewriter.html/js/css`): Dedicated interface for AI-powered text rewriting with platform-specific modes (Outlook/Teams)
5. **Popup Styles** (`popup.css`): Injected into pages for translation popup styling and model indicator

### Message Flow

1. **Translation Flow**:
   - User double-clicks or Ctrl+clicks text → `content.js` detects selection
   - Content script sends message to service worker via `chrome.runtime.sendMessage`
   - Service worker processes translation request (checks cache, calls API)
   - Response flows back to content script → Updates popup UI

2. **Rewriting Flow**:
   - User accesses rewriter page from options
   - Input text and settings sent to service worker
   - Service worker calls AI API with rewrite prompts
   - Multiple rewrite suggestions returned and displayed

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
2. **Translation Testing**: Navigate to any webpage → Double-click or Ctrl+click text → Verify popup appears with model indicator
3. **Rewriter Testing**: Navigate to rewriter page from options → Enter text → Select platform mode → Get AI suggestions
4. **Cache Verification**: Translate same text twice → Second translation should show "(cached)"
5. **Custom Base URL**: Test with custom API endpoints for self-hosted or proxy services

## Chrome Extension Manifest V3 Specifics

- Service workers replace background pages (no persistent background context)
- Content scripts inject into all URLs via `"matches": ["<all_urls>"]"`
- Uses `chrome.storage.local` for settings persistence
- Implements proper message passing between content scripts and service worker
- Supports Ctrl+click as alternative trigger for translation

## Translation & Rewriting API Integration

The extension supports two providers with configurable endpoints:
- **DeepSeek**: Default `https://api.deepseek.com/v1/chat/completions`
- **OpenAI**: Default `https://api.openai.com/v1/chat/completions`
- **Custom Base URL**: Support for custom API endpoints (proxy servers, self-hosted models)

Both use similar request formats but may have provider-specific model names and response handling. The rewriter feature uses specialized prompts for text improvement.

## Caching Strategy

- Translations cached in-memory in service worker with key format: `${text}_${targetLanguage}`
- Cache persisted to `chrome.storage.local` with max 100 entries (FIFO eviction)
- Cache can be disabled via settings or cleared manually

## Chrome Storage Keys

- `apiProvider`: 'deepseek' or 'openai'
- `apiKey`: Encrypted API key string
- `baseUrl`: Custom API base URL (optional)
- `model`: Model identifier (provider-specific)
- `targetLanguage`: ISO language code (default: 'zh-CN')
- `autoDetectLanguage`: Boolean flag
- `cacheTranslations`: Boolean flag
- `translationCache`: Object with translation history
- `lastSelectedText`: Most recent selection
- `previousModel`: Previously selected model for provider