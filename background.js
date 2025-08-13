// ABOUTME: Background service worker for handling messages and translation API calls
// ABOUTME: Manages communication between content scripts and extension components

let translationCache = {};
let translationCounters = {};  // Store counter for each unique text

chrome.runtime.onInstalled.addListener(() => {
  console.log('Better Text Translator extension installed');
  loadTranslationCache();
  loadTranslationCounters();
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
  
  // Increment counter for this specific text
  const counterKey = `${text}_${await getTargetLanguage()}`;
  if (!translationCounters[counterKey]) {
    translationCounters[counterKey] = 0;
  }
  translationCounters[counterKey]++;
  saveTranslationCounters();
  
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
        message: 'Please configure API settings first',
        counter: translationCounters[counterKey]
      });
      return;
    }
    
    const cacheKey = `${text}_${settings.targetLanguage || 'zh-CN'}`;
    
    if (settings.cacheTranslations !== false && translationCache[cacheKey]) {
      sendResponse({ 
        status: 'success', 
        translation: translationCache[cacheKey],
        fromCache: true,
        counter: translationCounters[counterKey]
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
      translation: translation,
      counter: translationCounters[counterKey]
    });
  } catch (error) {
    console.error('Translation error:', error);
    sendResponse({ 
      status: 'error', 
      message: error.message,
      counter: translationCounters[counterKey]
    });
  }
}

async function translateText(text, provider, apiKey, model, targetLanguage, autoDetect) {
  const languageName = getLanguageName(targetLanguage);
  const prompt = `Translate "${text}" to ${languageName} and provide 2 example sentences using the word/phrase with their ${languageName} translations.`;
  
  const responseSchema = {
    type: "object",
    properties: {
      translation: {
        type: "string",
        description: "The translation of the input text"
      },
      examples: {
        type: "array",
        items: {
          type: "object",
          properties: {
            english: {
              type: "string",
              description: "Example sentence in English using the word/phrase"
            },
            translation: {
              type: "string", 
              description: "Translation of the example sentence"
            }
          },
          required: ["english", "translation"],
          additionalProperties: false
        },
        minItems: 2,
        maxItems: 2,
        description: "Array of exactly 2 example sentences with translations"
      }
    },
    required: ["translation", "examples"],
    additionalProperties: false
  };
  
  if (provider === 'deepseek') {
    return await callDeepSeekAPI(apiKey, model, prompt, responseSchema);
  } else if (provider === 'openai') {
    return await callOpenAIAPI(apiKey, model, prompt, responseSchema);
  } else {
    throw new Error('Invalid API provider');
  }
}

async function callDeepSeekAPI(apiKey, model, prompt, responseSchema) {
  // DeepSeek doesn't support structured outputs yet, so we'll use a detailed prompt
  const enhancedPrompt = `${prompt}

Respond with valid JSON in this exact format:
{
  "translation": "the translation of the text",
  "examples": [
    {
      "english": "first example sentence using the word/phrase",
      "translation": "translation of first example"
    },
    {
      "english": "second example sentence using the word/phrase",
      "translation": "translation of second example"
    }
  ]
}

Important: Only return valid JSON, no other text.`;

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
          content: 'You are a professional translator. You must respond only with valid JSON in the exact format requested. Do not include any text outside the JSON structure.'
        },
        {
          role: 'user',
          content: enhancedPrompt
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
  const content = data.choices[0].message.content.trim();
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Fallback: if JSON parsing fails, return simple format
    return {
      translation: content,
      examples: []
    };
  }
}

async function callOpenAIAPI(apiKey, model, prompt, responseSchema) {
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
          content: 'You are a professional translator.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "translation_with_examples",
          schema: responseSchema,
          strict: true
        }
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Fallback: if JSON parsing fails, return simple format
    return {
      translation: content,
      examples: []
    };
  }
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
  const maxCacheSize = 1000;
  const cacheKeys = Object.keys(translationCache);
  
  if (cacheKeys.length > maxCacheSize) {
    const keysToRemove = cacheKeys.slice(0, cacheKeys.length - maxCacheSize);
    keysToRemove.forEach(key => delete translationCache[key]);
  }
  
  chrome.storage.local.set({ translationCache });
}

async function loadTranslationCounters() {
  const result = await chrome.storage.local.get('translationCounters');
  if (result.translationCounters) {
    translationCounters = result.translationCounters;
  }
}

function saveTranslationCounters() {
  // Limit the number of tracked texts to prevent storage bloat
  const maxTrackedTexts = 1000;
  const counterKeys = Object.keys(translationCounters);
  
  if (counterKeys.length > maxTrackedTexts) {
    // Sort by count and keep top 1000 most frequently translated texts
    const sortedEntries = counterKeys
      .map(key => ({ key, count: translationCounters[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTrackedTexts);
    
    const newCounters = {};
    sortedEntries.forEach(entry => {
      newCounters[entry.key] = entry.count;
    });
    translationCounters = newCounters;
  }
  
  chrome.storage.local.set({ translationCounters });
}

async function getTargetLanguage() {
  const settings = await chrome.storage.local.get('targetLanguage');
  return settings.targetLanguage || 'zh-CN';
}