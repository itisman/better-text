# Changelog

All notable changes to Better Text Chrome Extension will be documented in this file.

## 2025.08.27 14:44
* Added AI Text Rewriter feature - a dedicated interface for improving and rewriting text with platform-specific modes (Outlook/Teams)
* Added support for custom API base URLs - users can now configure proxy servers or self-hosted models
* Added model indicator display - current AI model now shows in top-right corner of translation popup and rewriter interface
* Added Ctrl+click as alternative trigger for text translation alongside double-click
* Improved model selection persistence - extension now remembers previously selected models per provider
* Fixed connection test message display issue - error messages now show correctly when API connection fails
* Enhanced settings page with navigation links between translator and rewriter interfaces
* Added language toggle (English/Chinese) support in the rewriter interface

## 2025.08.14 17:00
* Added translation counter display in popup to show API usage
* Improved popup UI with better visual hierarchy and spacing
* Added sample sentences for testing translations
* Enhanced popup positioning to avoid edge cases

## 2025.08.13 12:00
* Initial release with core translation functionality
* Support for DeepSeek and OpenAI APIs
* Double-click text selection and translation
* Translation caching to reduce API calls
* Auto-detect source language capability
* Support for 13+ target languages
* Clean and modern UI with gradient headers