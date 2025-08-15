// ABOUTME: Background service worker for handling messages and translation API calls
// ABOUTME: Manages communication between content scripts and extension components

let translationCache = {};
let translationCounters = {};  // Store counter for each unique text

chrome.runtime.onInstalled.addListener(() => {
  console.log('Better Text Translator extension installed');
  loadTranslationCache();
  loadTranslationCounters();
});

// Handle extension icon click to open rewriter in new tab
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: 'rewriter.html' });
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
  
  if (request.action === 'rewriteText') {
    handleTextRewrite(request, sendResponse);
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
      'deepseekApiKey',
      'openaiApiKey',
      'model',
      'deepseekModel',
      'openaiModel',
      'deepseekBaseUrl',
      'openaiBaseUrl',
      'targetLanguage',
      'autoDetectLanguage',
      'cacheTranslations'
    ]);
    
    // Get the appropriate API key, base URL, and model based on the provider
    let apiKeyToUse;
    let modelToUse;
    let baseUrlToUse;
    
    if (settings.apiProvider === 'deepseek') {
      apiKeyToUse = settings.deepseekApiKey || settings.apiKey;
      modelToUse = settings.deepseekModel || settings.model;
      baseUrlToUse = settings.deepseekBaseUrl;
    } else if (settings.apiProvider === 'openai') {
      apiKeyToUse = settings.openaiApiKey || settings.apiKey;
      modelToUse = settings.openaiModel || settings.model;
      baseUrlToUse = settings.openaiBaseUrl;
    } else {
      apiKeyToUse = settings.apiKey;
      modelToUse = settings.model;
    }
    
    if (!settings.apiProvider || !apiKeyToUse || !modelToUse) {
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
      apiKeyToUse,
      modelToUse,
      baseUrlToUse,
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

async function translateText(text, provider, apiKey, model, baseUrl, targetLanguage, autoDetect) {
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
    return await callDeepSeekAPI(apiKey, model, baseUrl, prompt, responseSchema);
  } else if (provider === 'openai') {
    return await callOpenAIAPI(apiKey, model, baseUrl, prompt, responseSchema);
  } else {
    throw new Error('Invalid API provider');
  }
}

async function callDeepSeekAPI(apiKey, model, baseUrl, prompt, responseSchema) {
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

  const apiEndpoint = baseUrl ? `${baseUrl}/v1/chat/completions` : 'https://api.deepseek.com/v1/chat/completions';
  const response = await fetch(apiEndpoint, {
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

async function callOpenAIAPI(apiKey, model, baseUrl, prompt, responseSchema) {
  const apiEndpoint = baseUrl ? `${baseUrl}/v1/chat/completions` : 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(apiEndpoint, {
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
    // Get the base URL from storage for the current provider
    const settings = await chrome.storage.local.get(['deepseekBaseUrl', 'openaiBaseUrl']);
    let baseUrl;
    if (request.apiProvider === 'deepseek') {
      baseUrl = settings.deepseekBaseUrl;
    } else if (request.apiProvider === 'openai') {
      baseUrl = settings.openaiBaseUrl;
    }
    
    const translation = await translateText(
      request.text,
      request.apiProvider,
      request.apiKey,
      request.model,
      baseUrl,
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

async function handleTextRewrite(request, sendResponse) {
  console.log('Rewrite request:', request);
  
  try {
    const settings = await chrome.storage.local.get([
      'apiProvider',
      'apiKey',
      'deepseekApiKey',
      'openaiApiKey',
      'model',
      'deepseekModel',
      'openaiModel',
      'deepseekBaseUrl',
      'openaiBaseUrl'
    ]);
    
    // Get the appropriate API key, base URL, and model based on the provider
    let apiKeyToUse;
    let modelToUse;
    let baseUrlToUse;
    
    if (settings.apiProvider === 'deepseek') {
      apiKeyToUse = settings.deepseekApiKey || settings.apiKey;
      modelToUse = settings.deepseekModel || settings.model;
      baseUrlToUse = settings.deepseekBaseUrl;
    } else if (settings.apiProvider === 'openai') {
      apiKeyToUse = settings.openaiApiKey || settings.apiKey;
      modelToUse = settings.openaiModel || settings.model;
      baseUrlToUse = settings.openaiBaseUrl;
    } else {
      apiKeyToUse = settings.apiKey;
      modelToUse = settings.model;
    }
    
    if (!settings.apiProvider || !apiKeyToUse || !modelToUse) {
      sendResponse({ 
        status: 'error', 
        message: 'Please configure API settings first'
      });
      return;
    }
    
    const rewrites = await rewriteText(
      request.text,
      request.platform,
      request.targetLanguage,
      settings.apiProvider,
      apiKeyToUse,
      modelToUse,
      baseUrlToUse
    );
    
    sendResponse({ 
      status: 'success', 
      rewrites: rewrites
    });
  } catch (error) {
    console.error('Rewrite error:', error);
    sendResponse({ 
      status: 'error', 
      message: error.message
    });
  }
}

async function rewriteText(text, platform, targetLanguage, provider, apiKey, model, baseUrl) {
  // Determine tone based on platform
  const toneInstructions = platform === 'outlook' 
    ? 'Use a professional, formal, and business-appropriate tone. The language should be polished, clear, and suitable for professional email communication.'
    : 'Use a conversational, friendly, and relaxed tone. The language should be casual, approachable, and suitable for team chat communication.';
  
  const languageInstruction = targetLanguage === 'zh' 
    ? 'Write the rewrites in Chinese (Simplified).'
    : 'Write the rewrites in English.';
  
  const prompt = `Rewrite the following text with these requirements:
1. ${toneInstructions}
2. ${languageInstruction}
3. Preserve the exact meaning and intent of the original text - do not add or remove information.
4. Fix any grammatical issues and improve coherence.
5. Make the expression more natural and appropriate for the chosen platform (${platform === 'outlook' ? 'Outlook email' : 'Teams chat'}).
6. Provide exactly 3 different variations.

Original text: "${text}"

Provide 3 different rewrites that maintain the same meaning but with improved expression.`;
  
  const responseSchema = {
    type: "object",
    properties: {
      rewrites: {
        type: "array",
        items: {
          type: "string",
          description: "A rewritten version of the text"
        },
        minItems: 3,
        maxItems: 3,
        description: "Exactly 3 different rewrites of the text"
      }
    },
    required: ["rewrites"],
    additionalProperties: false
  };
  
  if (provider === 'deepseek') {
    return await callDeepSeekRewriteAPI(apiKey, model, baseUrl, prompt, responseSchema);
  } else if (provider === 'openai') {
    return await callOpenAIRewriteAPI(apiKey, model, baseUrl, prompt, responseSchema);
  } else {
    throw new Error('Invalid API provider');
  }
}

async function callDeepSeekRewriteAPI(apiKey, model, baseUrl, prompt, responseSchema) {
  const enhancedPrompt = `${prompt}

Respond with valid JSON in this exact format:
{
  "rewrites": [
    "First rewritten version",
    "Second rewritten version",
    "Third rewritten version"
  ]
}

Important: Only return valid JSON, no other text.`;

  const apiEndpoint = baseUrl ? `${baseUrl}/v1/chat/completions` : 'https://api.deepseek.com/v1/chat/completions';
  const response = await fetch(apiEndpoint, {
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
          content: 'You are a professional writing assistant. You must respond only with valid JSON in the exact format requested. Do not include any text outside the JSON structure.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  try {
    const parsed = JSON.parse(content);
    return parsed.rewrites;
  } catch (parseError) {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse API response');
  }
}

async function callOpenAIRewriteAPI(apiKey, model, baseUrl, prompt, responseSchema) {
  const apiEndpoint = baseUrl ? `${baseUrl}/v1/chat/completions` : 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(apiEndpoint, {
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
          content: 'You are a professional writing assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "text_rewrites",
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
    const parsed = JSON.parse(content);
    return parsed.rewrites;
  } catch (parseError) {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse API response');
  }
}