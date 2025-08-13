// ABOUTME: Content script that detects double-click text selection
// ABOUTME: Creates a popup to display the selected text and translation in top-right corner

let popupElement = null;
let selectedText = '';

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
        if (response.counter) {
          additionalInfo += `<span class="counter-indicator"> [#${response.counter}]</span>`;
        }
        translationElement.innerHTML += additionalInfo;
      } else if (response.status === 'error') {
        translationElement.innerHTML = `<span class="error-text">${response.message}</span>`;
        examplesContainer.innerHTML = '<div class="no-examples">Unable to load examples</div>';
        if (response.counter) {
          translationElement.innerHTML += `<span class="counter-indicator"> [#${response.counter}]</span>`;
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

document.addEventListener('dblclick', handleDoubleClick);

document.addEventListener('click', (event) => {
  if (popupElement && !popupElement.contains(event.target)) {
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