// ABOUTME: Background service worker for handling messages and translation API calls
// ABOUTME: Manages communication between content scripts and extension components

let translationCache = {};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Better Text Translator extension installed');
  loadTranslationCache();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'textSelected') {
    handleTextSelection(request.text, sendResponse);
    return true;
  }
  
  if (request.action === 'testTranslation') {
    testTranslation(request, sendResponse);
    return true;
  }
  
  return true;
});

async function handleTextSelection(text, sendResponse) {
  console.log('Text selected:', text);
  
  chrome.storage.local.set({ lastSelectedText: text });
  
  try {
    const settings = await chrome.storage.local.get([
      'apiProvider',
      'apiKey',
      'model',
      'targetLanguage',
      'autoDetectLanguage',
      'cacheTranslations'
    ]);
    
    if (!settings.apiProvider || !settings.apiKey || !settings.model) {
      sendResponse({ 
        status: 'error', 
        message: 'Please configure API settings first' 
      });
      return;
    }
    
    const cacheKey = `${text}_${settings.targetLanguage || 'zh-CN'}`;
    
    if (settings.cacheTranslations !== false && translationCache[cacheKey]) {
      sendResponse({ 
        status: 'success', 
        translation: translationCache[cacheKey],
        fromCache: true
      });
      return;
    }
    
    const translation = await translateText(
      text,
      settings.apiProvider,
      settings.apiKey,
      settings.model,
      settings.targetLanguage || 'zh-CN',
      settings.autoDetectLanguage !== false
    );
    
    if (settings.cacheTranslations !== false) {
      translationCache[cacheKey] = translation;
      saveTranslationCache();
    }
    
    sendResponse({ 
      status: 'success', 
      translation: translation 
    });
  } catch (error) {
    console.error('Translation error:', error);
    sendResponse({ 
      status: 'error', 
      message: error.message 
    });
  }
}

async function translateText(text, provider, apiKey, model, targetLanguage, autoDetect) {
  const prompt = autoDetect 
    ? `Translate the following text to ${getLanguageName(targetLanguage)}. Only provide the translation, no explanations:\n\n${text}`
    : `Translate the following text to ${getLanguageName(targetLanguage)}. Only provide the translation, no explanations:\n\n${text}`;
  
  if (provider === 'deepseek') {
    return await callDeepSeekAPI(apiKey, model, prompt);
  } else if (provider === 'openai') {
    return await callOpenAIAPI(apiKey, model, prompt);
  } else {
    throw new Error('Invalid API provider');
  }
}

async function callDeepSeekAPI(apiKey, model, prompt) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Provide only the translation without any explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callOpenAIAPI(apiKey, model, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Provide only the translation without any explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function testTranslation(request, sendResponse) {
  try {
    const translation = await translateText(
      request.text,
      request.apiProvider,
      request.apiKey,
      request.model,
      request.targetLanguage,
      true
    );
    sendResponse({ success: true, translation });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

function getLanguageName(code) {
  const languages = {
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'en': 'English'
  };
  return languages[code] || code;
}

async function loadTranslationCache() {
  const result = await chrome.storage.local.get('translationCache');
  if (result.translationCache) {
    translationCache = result.translationCache;
  }
}

function saveTranslationCache() {
  const maxCacheSize = 100;
  const cacheKeys = Object.keys(translationCache);
  
  if (cacheKeys.length > maxCacheSize) {
    const keysToRemove = cacheKeys.slice(0, cacheKeys.length - maxCacheSize);
    keysToRemove.forEach(key => delete translationCache[key]);
  }
  
  chrome.storage.local.set({ translationCache });
}