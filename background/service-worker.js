// Background service worker for Text Extractor extension
// Handles extension icon clicks, manages extension state, and coordinates between content scripts

// Extension state management
let isSelectionModeActive = false;

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Toggle selection mode
    isSelectionModeActive = !isSelectionModeActive;
    
    if (isSelectionModeActive) {
      // Activate selection mode
      await activateSelectionMode(tab.id);
    } else {
      // Deactivate selection mode
      await deactivateSelectionMode(tab.id);
    }
  } catch (error) {
    console.error('Error handling extension icon click:', error);
    isSelectionModeActive = false;
  }
});

/**
 * Activate selection mode on the current tab
 * @param {number} tabId - The ID of the tab to activate selection mode on
 */
async function activateSelectionMode(tabId) {
  try {
    // First, ensure content scripts are ready by injecting them if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/selection-overlay.js']
      });
      console.log('Content script injected/ensured');
    } catch (injectError) {
      console.warn('Content script injection failed, but may already be loaded:', injectError);
    }

    // Wait a bit for scripts to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send message to activate selection mode
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'activateSelectionMode'
    });

    // Update extension icon to show active state
    chrome.action.setBadgeText({ text: 'ON', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#4285F4' });

    console.log('Selection mode activated successfully');
  } catch (error) {
    console.error('Error activating selection mode:', error);

    // Try one more time with a longer delay
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'activateSelectionMode'
      });

      chrome.action.setBadgeText({ text: 'ON', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4285F4' });

      console.log('Selection mode activated on retry');
    } catch (retryError) {
      console.error('Selection mode activation failed completely:', retryError);
      throw retryError;
    }
  }
}

/**
 * Deactivate selection mode on the current tab
 * @param {number} tabId - The ID of the tab to deactivate selection mode on
 */
async function deactivateSelectionMode(tabId) {
  try {
    // Send message to content script to deactivate selection mode
    await chrome.tabs.sendMessage(tabId, {
      action: 'deactivateSelectionMode'
    });
    
    // Update extension icon to show inactive state
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    
    isSelectionModeActive = false;
    console.log('Selection mode deactivated');
  } catch (error) {
    console.error('Error deactivating selection mode:', error);
    // Don't throw - allow deactivation even if content script fails
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'selectionComplete') {
    // Handle basic selection completion (fallback)
    handleSelectionComplete(message.data, sender.tab.id);
    sendResponse({ success: true });
  } else if (message.action === 'textExtractionComplete') {
    // Handle text extraction completion
    handleTextExtractionComplete(message.data, message.selection, sender.tab.id);
    sendResponse({ success: true });
  } else if (message.action === 'extractionError') {
    // Handle extraction error
    handleExtractionError(message.error, message.selection, sender.tab.id);
    sendResponse({ success: true });
  } else if (message.action === 'cancelSelection') {
    // Handle selection cancellation
    handleSelectionCancel(sender.tab.id);
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

/**
 * Handle selection completion (fallback for basic selection)
 * @param {Object} data - Selection data (coordinates, etc.)
 * @param {number} tabId - The ID of the tab
 */
function handleSelectionComplete(data, tabId) {
  console.log('Selection completed (basic):', data);
  // Show popup with basic selection info
  showExtractionPopup({
    selectableText: '',
    ocrText: '',
    combinedText: 'Selection captured but text extraction is not available.',
    images: [],
    errors: []
  }, data, tabId);
}

/**
 * Handle text extraction completion
 * @param {Object} data - Extracted text data
 * @param {Object} selection - Selection coordinates
 * @param {number} tabId - The ID of the tab
 */
function handleTextExtractionComplete(data, selection, tabId) {
  console.log('Text extraction completed:', data);
  showExtractionPopup(data, selection, tabId);
}

/**
 * Handle extraction error
 * @param {string} error - Error message
 * @param {Object} selection - Selection coordinates
 * @param {number} tabId - The ID of the tab
 */
function handleExtractionError(error, selection, tabId) {
  console.error('Text extraction error:', error);
  showExtractionPopup({
    selectableText: '',
    ocrText: '',
    combinedText: '',
    images: [],
    errors: [{ message: error, type: 'extraction_error' }]
  }, selection, tabId);
}

/**
 * Handle selection cancellation
 * @param {number} tabId - The ID of the tab
 */
function handleSelectionCancel(tabId) {
  console.log('Selection cancelled');
  isSelectionModeActive = false;
  chrome.action.setBadgeText({ text: '', tabId: tabId });
}

/**
 * Show extraction popup with results
 * @param {Object} data - Extracted text data
 * @param {Object} selection - Selection coordinates
 * @param {number} tabId - The ID of the tab
 */
async function showExtractionPopup(data, selection, tabId) {
  try {
    // Reset selection mode state
    isSelectionModeActive = false;
    chrome.action.setBadgeText({ text: '', tabId: tabId });

    // Inject popup script and HTML if not already present
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['popup/popup.js']
    });

    // Inject popup CSS if not already present
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['popup/popup.css']
    });

    // Create and inject popup HTML
    try {
      const popupHtml = await fetch(chrome.runtime.getURL('popup/popup.html'))
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.text();
        });

      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (html, data, selection) => {
          try {
            // Remove existing popup if any
            const existingPopup = document.getElementById('text-extractor-popup-container');
            if (existingPopup) {
              existingPopup.remove();
            }

            // Create popup container
            const container = document.createElement('div');
            container.innerHTML = html;
            container.id = 'text-extractor-popup-container';
            document.body.appendChild(container);

            // Load popup script and CSS
            const popupScript = document.createElement('script');
            popupScript.src = chrome.runtime.getURL('popup/popup.js');
            popupScript.onload = () => {
              console.log('Popup script loaded successfully');
              // Wait a bit for initialization, then show popup
              setTimeout(() => {
                if (window.textExtractorPopup) {
                  window.textExtractorPopup.show(data, selection);
                } else {
                  console.error('Popup script loaded but window.textExtractorPopup not available');
                }
              }, 200);
            };
            popupScript.onerror = () => {
              console.error('Failed to load popup script');
            };
            document.head.appendChild(popupScript);
          } catch (popupError) {
            console.error('Error creating popup:', popupError);
          }
        },
        args: [popupHtml, data, selection]
      });
    } catch (fetchError) {
      console.error('Error fetching popup HTML:', fetchError);
    }

  } catch (error) {
    console.error('Error showing extraction popup:', error);
  }
}

// Handle extension installation/startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Text Extractor extension installed');
});

// Service worker initialized and ready
