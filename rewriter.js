// ABOUTME: JavaScript logic for AI Text Rewriter page handling UI interactions
// ABOUTME: Manages platform toggle, language selection, and rewrite requests

let currentPlatform = 'outlook';
let currentLanguage = 'en';
let currentResults = null;

document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
  setupEventListeners();
  loadUserPreferences();
  checkAPIConfiguration();
  displayCurrentModel();
  loadHistoryUI();
}

function setupEventListeners() {
  // Platform toggle
  document.getElementById('outlookToggle').addEventListener('click', () => setPlatform('outlook'));
  document.getElementById('teamsToggle').addEventListener('click', () => setPlatform('teams'));
  
  // Language toggle
  document.getElementById('langEn').addEventListener('click', () => setLanguage('en'));
  document.getElementById('langZh').addEventListener('click', () => setLanguage('zh'));
  
  // Rewrite button
  document.getElementById('rewriteBtn').addEventListener('click', handleRewrite);
  
  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });
  
  // Enter key in textarea
  document.getElementById('inputText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleRewrite();
    }
  });
  
  // New rewrite button
  document.getElementById('newRewriteBtn').addEventListener('click', handleNewRewrite);
}

function setPlatform(platform) {
  currentPlatform = platform;
  
  // Update UI
  document.getElementById('outlookToggle').classList.toggle('active', platform === 'outlook');
  document.getElementById('teamsToggle').classList.toggle('active', platform === 'teams');
  
  // Update body class for styling
  document.body.classList.toggle('teams-mode', platform === 'teams');
  
  // Save preference
  chrome.storage.local.set({ rewriterPlatform: platform });
}

function setLanguage(language) {
  currentLanguage = language;
  
  // Update UI
  document.getElementById('langEn').classList.toggle('active', language === 'en');
  document.getElementById('langZh').classList.toggle('active', language === 'zh');
  
  // Save preference
  chrome.storage.local.set({ rewriterLanguage: language });
}

async function loadUserPreferences() {
  const prefs = await chrome.storage.local.get(['rewriterPlatform', 'rewriterLanguage']);
  
  if (prefs.rewriterPlatform) {
    setPlatform(prefs.rewriterPlatform);
  }
  
  if (prefs.rewriterLanguage) {
    setLanguage(prefs.rewriterLanguage);
  }
}

async function checkAPIConfiguration() {
  const settings = await chrome.storage.local.get(['apiProvider', 'apiKey', 'model']);
  
  if (!settings.apiProvider || !settings.apiKey || !settings.model) {
    showStatus('Please configure API settings first. <a href="options.html">Go to Settings</a>', 'error');
    document.getElementById('rewriteBtn').disabled = true;
  }
}

async function handleRewrite() {
  const inputText = document.getElementById('inputText').value.trim();
  
  if (!inputText) {
    showStatus('Please enter some text to rewrite', 'error');
    return;
  }
  
  // Show loading state
  showLoading(true);
  hideResults();
  hideStatus();
  
  try {
    // Send rewrite request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'rewriteText',
      text: inputText,
      platform: currentPlatform,
      targetLanguage: currentLanguage
    });
    
    if (response.status === 'success') {
      displayResults(response.rewrites);
      showStatus('Text rewritten successfully!', 'success');
      
      // Save to history with ALL generated options
      if (response.rewrites && response.rewrites.length > 0) {
        await saveRewriteHistory(inputText, response.rewrites[0], currentPlatform, currentLanguage, response.rewrites);
        await loadHistoryUI(); // Refresh history display
      }
    } else {
      showStatus(response.message || 'Failed to rewrite text', 'error');
    }
  } catch (error) {
    console.error('Rewrite error:', error);
    showStatus('An error occurred while rewriting text', 'error');
  } finally {
    showLoading(false);
  }
}

function displayResults(rewrites) {
  currentResults = rewrites;
  
  // Display each rewrite option
  if (rewrites && rewrites.length >= 3) {
    document.getElementById('option1').textContent = rewrites[0];
    document.getElementById('option2').textContent = rewrites[1];
    document.getElementById('option3').textContent = rewrites[2];
    
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    
    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    showStatus('Failed to generate enough rewrite options', 'error');
  }
}

async function handleCopy(event) {
  const button = event.target;
  const optionNumber = parseInt(button.dataset.option);
  
  if (!currentResults || !currentResults[optionNumber - 1]) {
    showStatus('No text to copy', 'error');
    return;
  }
  
  const textToCopy = currentResults[optionNumber - 1];
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Visual feedback
    button.textContent = 'COPIED!';
    button.classList.add('copied');
    
    setTimeout(() => {
      button.textContent = 'COPY';
      button.classList.remove('copied');
    }, 2000);
    
    showStatus('Text copied to clipboard!', 'success');
  } catch (error) {
    console.error('Copy failed:', error);
    showStatus('Failed to copy text', 'error');
  }
}

function showLoading(show) {
  document.getElementById('loadingSection').style.display = show ? 'block' : 'none';
  document.getElementById('rewriteBtn').disabled = show;
}

function hideResults() {
  document.getElementById('resultsSection').style.display = 'none';
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.innerHTML = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      if (statusEl.classList.contains('success')) {
        statusEl.style.display = 'none';
      }
    }, 3000);
  }
}

function hideStatus() {
  document.getElementById('status').style.display = 'none';
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
  
  document.getElementById('currentModel').textContent = modelToDisplay;
  
  // Update model display when settings change
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.apiProvider || changes.model || changes.deepseekModel || changes.openaiModel)) {
      displayCurrentModel();
    }
  });
}

// History Storage Functions
async function saveRewriteHistory(originalText, rewrittenText, platform, language, allOptions = []) {
  try {
    const history = await loadRewriteHistory();
    
    const historyEntry = {
      id: Date.now().toString(),
      originalText: originalText,
      rewrittenText: rewrittenText,
      platform: platform,
      language: language,
      timestamp: new Date().toISOString(),
      allOptions: allOptions // Store all generated rewrite options
    };
    
    // Add to beginning of array and limit to 5 entries
    history.unshift(historyEntry);
    
    // Keep only latest 5 entries
    const limitedHistory = history.slice(0, 5);
    
    await chrome.storage.local.set({ rewriteHistory: limitedHistory });
    return limitedHistory;
  } catch (error) {
    console.error('Failed to save rewrite history:', error);
    return [];
  }
}

async function loadRewriteHistory() {
  try {
    const result = await chrome.storage.local.get(['rewriteHistory']);
    return result.rewriteHistory || [];
  } catch (error) {
    console.error('Failed to load rewrite history:', error);
    return [];
  }
}

async function clearRewriteHistory() {
  try {
    await chrome.storage.local.remove(['rewriteHistory']);
    await loadHistoryUI();
  } catch (error) {
    console.error('Failed to clear rewrite history:', error);
  }
}

// History UI Functions
async function loadHistoryUI() {
  const history = await loadRewriteHistory();
  const historyList = document.getElementById('historyList');
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No recent rewrites</div>';
    return;
  }
  
  historyList.innerHTML = '';
  
  history.forEach(entry => {
    const historyItem = createHistoryItem(entry);
    historyList.appendChild(historyItem);
  });
}

function createHistoryItem(entry) {
  const item = document.createElement('div');
  item.className = 'history-item';
  item.dataset.entryId = entry.id;
  
  const text = document.createElement('div');
  text.className = 'history-item-text';
  text.textContent = entry.originalText;
  
  const meta = document.createElement('div');
  meta.className = 'history-item-meta';
  
  const time = document.createElement('span');
  time.className = 'history-item-time';
  time.textContent = formatRelativeTime(entry.timestamp);
  
  const mode = document.createElement('span');
  mode.className = 'history-item-mode';
  mode.textContent = `${entry.platform}/${entry.language}`;
  
  // Add indicator if saved options are available
  if (entry.allOptions && entry.allOptions.length > 0) {
    const optionsIndicator = document.createElement('span');
    optionsIndicator.className = 'history-item-options';
    optionsIndicator.textContent = `${entry.allOptions.length} options`;
    optionsIndicator.title = 'Click to restore saved rewrite options';
    meta.appendChild(optionsIndicator);
  }
  
  meta.appendChild(time);
  meta.appendChild(mode);
  
  item.appendChild(text);
  item.appendChild(meta);
  
  // Add click handler
  item.addEventListener('click', () => handleHistoryItemClick(entry));
  
  return item;
}

function handleHistoryItemClick(entry) {
  // Populate textarea with historical content
  document.getElementById('inputText').value = entry.originalText;
  
  // Set platform and language to match history entry
  setPlatform(entry.platform);
  setLanguage(entry.language);
  
  // Clear any existing results first
  hideResults();
  hideStatus();
  
  // If the history entry has saved options, restore them
  if (entry.allOptions && entry.allOptions.length > 0) {
    // Display the saved options
    displayResults(entry.allOptions);
    showStatus('Historical text and rewrite options restored.', 'success');
  } else {
    // For older history entries without saved options
    showStatus('Historical text loaded. Click Rewrite to generate new options.', 'info');
  }
}

function handleNewRewrite() {
  // Clear current content
  document.getElementById('inputText').value = '';
  
  // Hide results and status
  hideResults();
  hideStatus();
  
  // Focus on textarea
  document.getElementById('inputText').focus();
  
  // Show feedback
  showStatus('Ready for new rewrite!', 'success');
}

function formatRelativeTime(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return time.toLocaleDateString();
}