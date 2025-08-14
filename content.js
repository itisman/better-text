// ABOUTME: Content script that detects double-click text selection
// ABOUTME: Creates a popup to display the selected text and translation in top-right corner

let popupElement = null;
let selectedText = '';
let modifierClickSettings = {
  enabled: true,
  preferredModifier: 'auto', // 'ctrl', 'alt', 'shift', 'auto'
  smartCrossPlatform: true
};

// Load modifier click settings from storage
async function loadModifierClickSettings() {
  try {
    const settings = await chrome.storage.local.get([
      'enableModifierClick',
      'preferredModifier', 
      'smartCrossPlatform'
    ]);
    
    modifierClickSettings.enabled = settings.enableModifierClick !== false; // default true
    modifierClickSettings.preferredModifier = settings.preferredModifier || 'auto';
    modifierClickSettings.smartCrossPlatform = settings.smartCrossPlatform !== false; // default true
  } catch (error) {
    console.error('Error loading modifier click settings:', error);
  }
}

// Check if the correct modifier key is pressed based on settings and platform
function isModifierActive(event) {
  if (!modifierClickSettings.enabled) return false;
  
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const modifier = modifierClickSettings.preferredModifier;
  
  switch (modifier) {
    case 'ctrl':
      return event.ctrlKey;
    case 'alt':
      return event.altKey;
    case 'shift':
      return event.shiftKey;
    case 'auto':
      if (modifierClickSettings.smartCrossPlatform) {
        // Use Command on Mac, Ctrl on other platforms
        return isMac ? event.metaKey : event.ctrlKey;
      } else {
        // Default to Ctrl regardless of platform
        return event.ctrlKey;
      }
    default:
      return false;
  }
}

function createPopup() {
  if (popupElement) {
    popupElement.remove();
  }
  
  popupElement = document.createElement('div');
  popupElement.id = 'better-text-popup';
  popupElement.className = 'better-text-popup';
  
  const header = document.createElement('div');
  header.className = 'popup-header';
  
  const title = document.createElement('span');
  title.textContent = 'Text Translator';
  title.className = 'popup-title';
  
  const counterDisplay = document.createElement('span');
  counterDisplay.className = 'popup-counter';
  counterDisplay.id = 'popup-counter';
  counterDisplay.style.display = 'none'; // Hidden initially
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.className = 'popup-close';
  closeBtn.onclick = () => {
    if (popupElement) {
      popupElement.remove();
      popupElement = null;
    }
  };
  
  header.appendChild(title);
  header.appendChild(counterDisplay);
  header.appendChild(closeBtn);
  
  const content = document.createElement('div');
  content.className = 'popup-content';
  
  const originalSection = document.createElement('div');
  originalSection.className = 'text-section';
  
  const originalLabel = document.createElement('div');
  originalLabel.className = 'section-label';
  originalLabel.textContent = 'Original:';
  
  const originalText = document.createElement('div');
  originalText.className = 'original-text';
  originalText.textContent = selectedText;
  
  originalSection.appendChild(originalLabel);
  originalSection.appendChild(originalText);
  
  const translationSection = document.createElement('div');
  translationSection.className = 'text-section';
  
  const translationLabel = document.createElement('div');
  translationLabel.className = 'section-label';
  translationLabel.textContent = 'Translation:';
  
  const translationText = document.createElement('div');
  translationText.className = 'translation-text';
  translationText.innerHTML = '<div class="loading-spinner"></div><span>Translating...</span>';
  
  translationSection.appendChild(translationLabel);
  translationSection.appendChild(translationText);
  
  const examplesSection = document.createElement('div');
  examplesSection.className = 'text-section examples-section';
  
  const examplesLabel = document.createElement('div');
  examplesLabel.className = 'section-label';
  examplesLabel.textContent = 'Example Sentences:';
  
  const examplesContainer = document.createElement('div');
  examplesContainer.className = 'examples-container';
  
  examplesSection.appendChild(examplesLabel);
  examplesSection.appendChild(examplesContainer);
  
  content.appendChild(originalSection);
  content.appendChild(translationSection);
  content.appendChild(examplesSection);
  
  popupElement.appendChild(header);
  popupElement.appendChild(content);
  document.body.appendChild(popupElement);
  
  setTimeout(() => {
    popupElement.classList.add('show');
  }, 10);
  
  requestTranslation(translationText, examplesContainer);
}

function requestTranslation(translationElement, examplesContainer) {
  if (!chrome.runtime) {
    translationElement.innerHTML = '<span class="error-text">Chrome runtime not available</span>';
    examplesContainer.innerHTML = '<div class="no-examples">Unable to load examples</div>';
    return;
  }

  chrome.runtime.sendMessage({
    action: 'textSelected',
    text: selectedText
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('Chrome runtime error:', chrome.runtime.lastError);
      translationElement.innerHTML = '<span class="error-text">Extension communication error</span>';
      examplesContainer.innerHTML = '<div class="no-examples">Unable to load examples</div>';
      return;
    }
    if (response) {
      if (response.status === 'success') {
        const translationData = response.translation;
        
        // Handle both old format (string) and new format (object)
        if (typeof translationData === 'string') {
          translationElement.textContent = translationData;
        } else {
          translationElement.textContent = translationData.translation || 'No translation available';
          
          // Display examples
          if (translationData.examples && translationData.examples.length > 0) {
            examplesContainer.innerHTML = '';
            translationData.examples.forEach((example, index) => {
              const exampleItem = document.createElement('div');
              exampleItem.className = 'example-item';
              
              const englishSentence = document.createElement('div');
              englishSentence.className = 'example-english';
              englishSentence.textContent = example.english;
              
              const translatedSentence = document.createElement('div');
              translatedSentence.className = 'example-translation';
              translatedSentence.textContent = example.translation;
              
              exampleItem.appendChild(englishSentence);
              exampleItem.appendChild(translatedSentence);
              examplesContainer.appendChild(exampleItem);
            });
          } else {
            examplesContainer.innerHTML = '<div class="no-examples">No example sentences available</div>';
          }
        }
        
        let additionalInfo = '';
        if (response.fromCache) {
          additionalInfo += '<span class="cache-indicator"> (cached)</span>';
        }
        if (additionalInfo) {
          translationElement.innerHTML += additionalInfo;
        }
        
        // Update counter in header
        if (response.counter) {
          const counterElement = document.getElementById('popup-counter');
          if (counterElement) {
            counterElement.textContent = `#${response.counter}`;
            counterElement.style.display = 'inline';
          }
        }
      } else if (response.status === 'error') {
        translationElement.innerHTML = `<span class="error-text">${response.message}</span>`;
        examplesContainer.innerHTML = '<div class="no-examples">Unable to load examples</div>';
        
        // Update counter in header even for errors
        if (response.counter) {
          const counterElement = document.getElementById('popup-counter');
          if (counterElement) {
            counterElement.textContent = `#${response.counter}`;
            counterElement.style.display = 'inline';
          }
        }
      }
    } else {
      translationElement.innerHTML = '<span class="error-text">Failed to get translation - no response from background script</span>';
      examplesContainer.innerHTML = '<div class="no-examples">Unable to load examples</div>';
    }
  });
}

function handleDoubleClick(event) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  if (selectedText && selectedText.length > 0) {
    createPopup();
  }
}

function handleModifierClick(event) {
  // Only proceed if modifier key is active
  if (!isModifierActive(event)) return;
  
  console.log('Modifier click detected:', {
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    settings: modifierClickSettings
  });
  
  // Prevent default behavior to avoid conflicts
  event.preventDefault();
  
  // Get any currently selected text
  let selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  console.log('Selected text:', selectedText);
  
  // If no text is selected, try to select word under cursor
  if (!selectedText || selectedText.length === 0) {
    selectedText = getWordAtPoint(event.clientX, event.clientY);
    console.log('Word at point:', selectedText);
  }
  
  if (selectedText && selectedText.length > 0) {
    console.log('Creating popup for:', selectedText);
    createPopup();
  } else {
    console.log('No text found to translate');
  }
}

// Helper function to get word at specific point (for modifier+click on unselected text)
function getWordAtPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  if (!element || !element.textContent) return '';
  
  // Get the text node at the point
  let range;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    // Firefox fallback
    const caretPosition = document.caretPositionFromPoint(x, y);
    if (caretPosition) {
      range = document.createRange();
      range.setStart(caretPosition.offsetNode, caretPosition.offset);
    }
  }
  
  if (!range || !range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) {
    return '';
  }
  
  const textNode = range.startContainer;
  const text = textNode.textContent;
  const offset = range.startOffset;
  
  // Find word boundaries
  let start = offset;
  let end = offset;
  
  // Move start back to beginning of word
  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }
  
  // Move end forward to end of word
  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }
  
  const word = text.substring(start, end).trim();
  
  // Select the word visually
  if (word) {
    const selection = window.getSelection();
    const wordRange = document.createRange();
    wordRange.setStart(textNode, start);
    wordRange.setEnd(textNode, end);
    selection.removeAllRanges();
    selection.addRange(wordRange);
  }
  
  return word;
}

document.addEventListener('dblclick', handleDoubleClick);

// Add modifier+click event listener
document.addEventListener('click', (event) => {
  // Handle modifier+click first
  handleModifierClick(event);
  
  // Then handle popup cleanup (only if not a modifier click)
  if (popupElement && !popupElement.contains(event.target) && !isModifierActive(event)) {
    const selection = window.getSelection();
    if (!selection.toString().trim()) {
      popupElement.remove();
      popupElement = null;
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && popupElement) {
    popupElement.remove();
    popupElement = null;
  }
});

// Initialize modifier click settings when content script loads
loadModifierClickSettings();