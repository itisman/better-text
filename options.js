// ABOUTME: Handles settings page logic for API configuration and translation preferences
// ABOUTME: Manages saving/loading settings from chrome.storage.local

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
];

const OPENAI_MODELS = [
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-5-mini', label: 'GPT-5-mini' },
  { value: 'gpt-5-nano', label: 'GPT-5-nano' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1-mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1-nano' }
];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadStatistics();
  setupEventListeners();
  displayCurrentModel();
});

function setupEventListeners() {
  document.getElementById('apiProvider').addEventListener('change', handleProviderChange);
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testConnection);
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
  document.getElementById('resetCounterBtn').addEventListener('click', resetCounter);
  document.getElementById('enableModifierClick').addEventListener('change', handleModifierClickToggle);
}

function handleModifierClickToggle(e) {
  const modifierGroup = document.getElementById('modifierGroup');
  const smartCrossPlatformGroup = document.querySelector('#smartCrossPlatform').closest('.form-group');
  
  if (e.target.checked) {
    modifierGroup.style.display = 'block';
    smartCrossPlatformGroup.style.display = 'block';
  } else {
    modifierGroup.style.display = 'none';
    smartCrossPlatformGroup.style.display = 'none';
  }
}

async function handleProviderChange(e) {
  const provider = e.target.value;
  const modelGroup = document.getElementById('modelGroup');
  const modelSelect = document.getElementById('model');
  
  if (!provider) {
    modelGroup.style.display = 'none';
    return;
  }
  
  modelGroup.style.display = 'block';
  modelSelect.innerHTML = '<option value="">Select a model</option>';
  
  const models = provider === 'deepseek' ? DEEPSEEK_MODELS : OPENAI_MODELS;
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelSelect.appendChild(option);
  });
  
  // Load the API key and model for the selected provider
  const settings = await chrome.storage.local.get(['deepseekApiKey', 'openaiApiKey', 'deepseekModel', 'openaiModel']);
  const apiKeyInput = document.getElementById('apiKey');
  
  if (provider === 'deepseek') {
    apiKeyInput.value = settings.deepseekApiKey || '';
    if (settings.deepseekModel) {
      modelSelect.value = settings.deepseekModel;
    }
  } else if (provider === 'openai') {
    apiKeyInput.value = settings.openaiApiKey || '';
    if (settings.openaiModel) {
      modelSelect.value = settings.openaiModel;
    }
  }
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get([
      'apiProvider',
      'apiKey',  // Keep for backward compatibility
      'deepseekApiKey',
      'openaiApiKey',
      'model',  // Keep for backward compatibility
      'deepseekModel',
      'openaiModel',
      'targetLanguage',
      'autoDetectLanguage',
      'cacheTranslations',
      'enableModifierClick',
      'preferredModifier',
      'smartCrossPlatform'
    ]);
    
    if (settings.apiProvider) {
      document.getElementById('apiProvider').value = settings.apiProvider;
      await handleProviderChange({ target: { value: settings.apiProvider } });
      
      // Load provider-specific model or fall back to generic model for backward compatibility
      setTimeout(() => {
        if (settings.apiProvider === 'deepseek' && settings.deepseekModel) {
          document.getElementById('model').value = settings.deepseekModel;
        } else if (settings.apiProvider === 'openai' && settings.openaiModel) {
          document.getElementById('model').value = settings.openaiModel;
        } else if (settings.model) {
          // Backward compatibility
          document.getElementById('model').value = settings.model;
        }
      }, 100);
    }
    
    if (settings.targetLanguage) {
      document.getElementById('targetLanguage').value = settings.targetLanguage;
    }
    
    document.getElementById('autoDetectLanguage').checked = 
      settings.autoDetectLanguage !== false;
    
    document.getElementById('cacheTranslations').checked = 
      settings.cacheTranslations !== false;
    
    // Load modifier click settings
    document.getElementById('enableModifierClick').checked = 
      settings.enableModifierClick !== false; // default true
    
    if (settings.preferredModifier) {
      document.getElementById('preferredModifier').value = settings.preferredModifier;
    }
    
    document.getElementById('smartCrossPlatform').checked = 
      settings.smartCrossPlatform !== false; // default true
    
    // Toggle modifier group visibility based on enableModifierClick
    handleModifierClickToggle({ target: { checked: settings.enableModifierClick !== false } });
      
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

async function saveSettings() {
  const apiProvider = document.getElementById('apiProvider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const targetLanguage = document.getElementById('targetLanguage').value;
  const autoDetectLanguage = document.getElementById('autoDetectLanguage').checked;
  const cacheTranslations = document.getElementById('cacheTranslations').checked;
  const enableModifierClick = document.getElementById('enableModifierClick').checked;
  const preferredModifier = document.getElementById('preferredModifier').value;
  const smartCrossPlatform = document.getElementById('smartCrossPlatform').checked;
  
  if (!apiProvider) {
    showStatus('Please select an API provider', 'error');
    return;
  }
  
  if (!apiKey) {
    showStatus('Please enter your API key', 'error');
    return;
  }
  
  if (!model) {
    showStatus('Please select a model', 'error');
    return;
  }
  
  try {
    // Prepare settings object with common settings
    const settings = {
      apiProvider,
      model,  // Keep for backward compatibility
      targetLanguage,
      autoDetectLanguage,
      cacheTranslations,
      enableModifierClick,
      preferredModifier,
      smartCrossPlatform
    };
    
    // Save provider-specific API key and model
    if (apiProvider === 'deepseek') {
      settings.deepseekApiKey = apiKey;
      settings.deepseekModel = model;
    } else if (apiProvider === 'openai') {
      settings.openaiApiKey = apiKey;
      settings.openaiModel = model;
    }
    
    // Also save as generic apiKey for backward compatibility
    settings.apiKey = apiKey;
    
    await chrome.storage.local.set(settings);
    
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

async function testConnection() {
  const apiProvider = document.getElementById('apiProvider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  
  if (!apiProvider || !apiKey || !model) {
    showStatus('Please configure API settings first', 'error');
    return;
  }
  
  showStatus('Testing connection...', 'info');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testTranslation',
      apiProvider,
      apiKey,
      model,
      text: 'Hello',
      targetLanguage: document.getElementById('targetLanguage').value
    });
    
    if (response.success) {
      showStatus(`Connection successful! Test translation`, 'success');
    } else {
      showStatus(`Connection failed: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('Test connection error:', error);
    showStatus('Error testing connection', 'error');
  }
}

async function clearCache() {
  try {
    await chrome.storage.local.remove('translationCache');
    showStatus('Translation cache cleared successfully!', 'success');
  } catch (error) {
    console.error('Error clearing cache:', error);
    showStatus('Error clearing cache', 'error');
  }
}

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
  statusEl.style.display = 'block';
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

async function loadStatistics() {
  try {
    const result = await chrome.storage.local.get(['translationCounters', 'targetLanguage']);
    const counters = result.translationCounters || {};
    const targetLang = result.targetLanguage || 'zh-CN';
    
    // Calculate total unique texts and total translations
    const counterEntries = Object.entries(counters);
    const uniqueTexts = counterEntries.length;
    const totalTranslations = counterEntries.reduce((sum, [_, count]) => sum + count, 0);
    
    document.getElementById('totalUniqueTexts').textContent = `Unique texts translated: ${uniqueTexts}`;
    document.getElementById('totalTranslations').textContent = `Total translation requests: ${totalTranslations}`;
    
    // Show top 10 most frequently translated texts
    const topTexts = counterEntries
      .filter(([key, _]) => key.endsWith(`_${targetLang}`))
      .map(([key, count]) => {
        const text = key.substring(0, key.lastIndexOf('_'));
        return { text, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const listContainer = document.getElementById('topTranslationsList');
    listContainer.innerHTML = '';
    
    if (topTexts.length === 0) {
      listContainer.innerHTML = '<p class="no-data">No translations yet</p>';
    } else {
      topTexts.forEach(({ text, count }) => {
        const item = document.createElement('div');
        item.className = 'translation-item';
        
        const truncatedText = text.length > 50 ? text.substring(0, 50) + '...' : text;
        item.innerHTML = `
          <span class="translation-text-preview">${truncatedText}</span>
          <span class="translation-count">${count} time${count > 1 ? 's' : ''}</span>
        `;
        
        listContainer.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
    document.getElementById('totalUniqueTexts').textContent = 'Error loading statistics';
    document.getElementById('totalTranslations').textContent = '';
  }
}

async function resetCounter() {
  try {
    await chrome.storage.local.set({ translationCounters: {} });
    showStatus('All translation counters reset successfully!', 'success');
    loadStatistics();
  } catch (error) {
    console.error('Error resetting counters:', error);
    showStatus('Error resetting counters', 'error');
  }
}

async function displayCurrentModel() {
  const settings = await chrome.storage.local.get(['apiProvider', 'model', 'deepseekModel', 'openaiModel']);
  
  let modelToDisplay = 'Not configured';
  
  if (settings.apiProvider === 'deepseek') {
    modelToDisplay = settings.deepseekModel || settings.model || 'DeepSeek (not set)';
  } else if (settings.apiProvider === 'openai') {
    modelToDisplay = settings.openaiModel || settings.model || 'OpenAI (not set)';
  } else if (settings.model) {
    modelToDisplay = settings.model;
  }
  
  const modelElement = document.getElementById('currentModel');
  if (modelElement) {
    modelElement.textContent = modelToDisplay;
  }
  
  // Update model display when settings change
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.apiProvider || changes.model || changes.deepseekModel || changes.openaiModel)) {
      displayCurrentModel();
    }
  });
}