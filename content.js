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
  
  content.appendChild(originalSection);
  content.appendChild(translationSection);
  
  popupElement.appendChild(header);
  popupElement.appendChild(content);
  document.body.appendChild(popupElement);
  
  setTimeout(() => {
    popupElement.classList.add('show');
  }, 10);
  
  requestTranslation(translationText);
}

function requestTranslation(translationElement) {
  chrome.runtime.sendMessage({
    action: 'textSelected',
    text: selectedText
  }, response => {
    if (response) {
      if (response.status === 'success') {
        translationElement.textContent = response.translation;
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
        if (response.counter) {
          translationElement.innerHTML += `<span class="counter-indicator"> [#${response.counter}]</span>`;
        }
      }
    } else {
      translationElement.innerHTML = '<span class="error-text">Failed to get translation</span>';
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