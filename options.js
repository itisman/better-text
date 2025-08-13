// ABOUTME: Handles settings page logic for API configuration and translation preferences
// ABOUTME: Manages saving/loading settings from chrome.storage.local

const DEEPSEEK_MODELS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder' }
];

const OPENAI_MODELS = [
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
];

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('apiProvider').addEventListener('change', handleProviderChange);
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testConnection);
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
}

function handleProviderChange(e) {
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
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get([
      'apiProvider',
      'apiKey',
      'model',
      'targetLanguage',
      'autoDetectLanguage',
      'cacheTranslations'
    ]);
    
    if (settings.apiProvider) {
      document.getElementById('apiProvider').value = settings.apiProvider;
      handleProviderChange({ target: { value: settings.apiProvider } });
      
      if (settings.model) {
        setTimeout(() => {
          document.getElementById('model').value = settings.model;
        }, 100);
      }
    }
    
    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }
    
    if (settings.targetLanguage) {
      document.getElementById('targetLanguage').value = settings.targetLanguage;
    }
    
    document.getElementById('autoDetectLanguage').checked = 
      settings.autoDetectLanguage !== false;
    
    document.getElementById('cacheTranslations').checked = 
      settings.cacheTranslations !== false;
      
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
    await chrome.storage.local.set({
      apiProvider,
      apiKey,
      model,
      targetLanguage,
      autoDetectLanguage,
      cacheTranslations
    });
    
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
      showStatus(`Connection successful! Test translation: "${response.translation}"`, 'success');
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