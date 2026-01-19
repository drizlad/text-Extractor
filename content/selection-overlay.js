// Content script for selection overlay
// Handles area selection on web pages

let isSelectionModeActive = false;
let isSelecting = false;
let startX = 0;
let startY = 0;
let selectionOverlay = null;
let selectionBox = null;
let loadingIndicator = null;

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('Content script received message:', message.action);

    if (message.action === 'activateSelectionMode') {
      activateSelectionMode();
      sendResponse({ success: true });
    } else if (message.action === 'deactivateSelectionMode') {
      deactivateSelectionMode();
      sendResponse({ success: true });
    } else {
      console.log('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true;
});

/**
 * Activate selection mode
 */
function activateSelectionMode() {
  if (isSelectionModeActive) {
    return; // Already active
  }
  
  isSelectionModeActive = true;
  
  // Create selection overlay
  createSelectionOverlay();
  
  // Change cursor to crosshair
  document.body.style.cursor = 'crosshair';
  
  // Add event listeners
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click', handleClickOutside);
  
  // Prevent text selection during selection mode
  document.addEventListener('selectstart', preventSelection);
  
  console.log('Selection mode activated');
}

/**
 * Deactivate selection mode
 */
function deactivateSelectionMode() {
  if (!isSelectionModeActive) {
    return; // Already inactive
  }
  
  isSelectionModeActive = false;
  isSelecting = false;
  
  // Remove selection overlay
  removeSelectionOverlay();
  
  // Restore cursor
  document.body.style.cursor = '';
  
  // Remove event listeners
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('selectstart', preventSelection);
  
  console.log('Selection mode deactivated');
}

/**
 * Create selection overlay element
 */
function createSelectionOverlay() {
  // Remove existing overlay if any
  removeSelectionOverlay();

  try {
    // Create overlay container
    selectionOverlay = document.createElement('div');
    selectionOverlay.id = 'text-extractor-overlay';
    selectionOverlay.className = 'text-extractor-overlay';
    selectionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    `;

    // Create selection box
    selectionBox = document.createElement('div');
    selectionBox.id = 'text-extractor-selection-box';
    selectionBox.className = 'text-extractor-selection-box';
    selectionBox.style.cssText = `
      position: absolute;
      border: 2px solid #4285F4;
      background-color: rgba(66, 133, 244, 0.1);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      display: none;
      box-sizing: border-box;
    `;

    selectionOverlay.appendChild(selectionBox);

    // Make sure body exists before appending
    if (document.body) {
      document.body.appendChild(selectionOverlay);
    } else {
      // If body doesn't exist yet, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body && !selectionOverlay.parentNode) {
          document.body.appendChild(selectionOverlay);
        }
      });
    }

    console.log('Selection overlay created');
  } catch (error) {
    console.error('Error creating selection overlay:', error);
  }
}

/**
 * Remove selection overlay
 */
function removeSelectionOverlay() {
  if (selectionOverlay && selectionOverlay.parentNode) {
    selectionOverlay.parentNode.removeChild(selectionOverlay);
  }
  selectionOverlay = null;
  selectionBox = null;
}

/**
 * Handle mouse down event (start selection)
 */
function handleMouseDown(event) {
  if (!isSelectionModeActive || event.button !== 0) {
    return; // Only handle left mouse button
  }

  // Only prevent default if we're not clicking on interactive elements
  const targetTag = event.target.tagName.toLowerCase();
  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'label'];

  if (interactiveTags.includes(targetTag) ||
      event.target.closest('a, button, input, select, textarea, [role="button"], [onclick]')) {
    return; // Don't interfere with interactive elements
  }

  event.preventDefault();
  event.stopPropagation();

  isSelecting = true;

  // Get starting coordinates relative to viewport
  startX = event.clientX;
  startY = event.clientY;

  // Initialize selection box position
  if (selectionBox) {
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  }

  console.log('Selection started at:', startX, startY);
}

/**
 * Handle mouse move event (update selection)
 */
function handleMouseMove(event) {
  if (!isSelectionModeActive || !isSelecting || !selectionBox) {
    return;
  }

  // Only prevent default during actual selection
  if (isSelecting) {
    event.preventDefault();
  }

  const currentX = event.clientX;
  const currentY = event.clientY;

  // Calculate selection box dimensions
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Update selection box
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

/**
 * Handle mouse up event (complete selection)
 */
function handleMouseUp(event) {
  if (!isSelectionModeActive || !isSelecting) {
    return;
  }
  
  event.preventDefault();
  event.stopPropagation();
  
  isSelecting = false;
  
  // Get final selection coordinates
  if (selectionBox) {
    const rect = selectionBox.getBoundingClientRect();
    
    // Convert viewport coordinates to page coordinates
    const selectionData = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      viewportX: rect.left,
      viewportY: rect.top,
      viewportWidth: rect.width,
      viewportHeight: rect.height
    };
    
    // Only proceed if selection has meaningful size
    if (selectionData.width > 5 && selectionData.height > 5) {
      handleSelectionComplete(selectionData);
    } else {
      // Cancel selection if too small
      removeSelectionOverlay();
    }
  }
}

/**
 * Show loading indicator
 * @param {string} message - Loading message to display
 */
function showLoadingIndicator(message = 'Extracting text...') {
  hideLoadingIndicator(); // Remove any existing

  loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'text-extractor-loading';
  loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">${message}</div>
  `;

  document.body.appendChild(loadingIndicator);

  // Add loading class to html element
  document.documentElement.classList.add('text-extractor-loading');
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
  if (loadingIndicator && loadingIndicator.parentNode) {
    loadingIndicator.parentNode.removeChild(loadingIndicator);
  }
  loadingIndicator = null;

  // Remove loading class from html element
  document.documentElement.classList.remove('text-extractor-loading');
}

/**
 * Handle selection completion
 */
async function handleSelectionComplete(selectionData) {
  console.log('Selection completed:', selectionData);

  // Show loading indicator
  showLoadingIndicator('Extracting text from selection...');

  try {
    // Check if text extraction utilities are available
    if (typeof window.TextExtractor !== 'undefined' &&
        typeof window.TextExtractor.extractTextFromSelection === 'function') {

      console.log('Using text extraction utilities');

      // Extract text using the text extractor utility
      const extractedData = await window.TextExtractor.extractTextFromSelection(selectionData);

      console.log('Text extraction completed:', extractedData);

      // Send extracted data to service worker
      chrome.runtime.sendMessage({
        action: 'textExtractionComplete',
        data: extractedData,
        selection: selectionData
      });

    } else {
      console.warn('Text extraction utilities not available, checking what is loaded:', {
        TextExtractor: typeof window.TextExtractor,
        extractTextFromSelection: typeof window.TextExtractor?.extractTextFromSelection
      });

      // Fallback: send basic selection data
      chrome.runtime.sendMessage({
        action: 'selectionComplete',
        data: selectionData
      });
    }

  } catch (error) {
    console.error('Error during text extraction:', error);

    // Send error to service worker
    chrome.runtime.sendMessage({
      action: 'extractionError',
      error: error.message,
      selection: selectionData
    });

  } finally {
    // Hide loading indicator
    hideLoadingIndicator();

    // Remove selection overlay
    removeSelectionOverlay();
  }
}

/**
 * Handle keyboard events (ESC to cancel)
 */
function handleKeyDown(event) {
  if (!isSelectionModeActive) {
    return;
  }
  
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    
    // Cancel selection
    isSelecting = false;
    removeSelectionOverlay();
    
    // Notify service worker
    chrome.runtime.sendMessage({
      action: 'cancelSelection'
    });
    
    // Deactivate selection mode
    deactivateSelectionMode();
  }
}

/**
 * Handle click outside to cancel selection mode
 * This handles clicks when selection mode is active but user is not actively selecting
 */
function handleClickOutside(event) {
  if (!isSelectionModeActive || isSelecting) {
    return; // Only handle if selection mode is active but not currently selecting
  }
  
  // If user clicks on the overlay itself (not starting a selection), cancel
  if (event.target === selectionOverlay || event.target === selectionBox) {
    event.preventDefault();
    event.stopPropagation();
    
    // Cancel selection mode
    removeSelectionOverlay();
    
    // Notify service worker
    chrome.runtime.sendMessage({
      action: 'cancelSelection'
    });
    
    // Deactivate selection mode
    deactivateSelectionMode();
  }
}

/**
 * Prevent text selection during selection mode
 */
function preventSelection(event) {
  if (isSelectionModeActive && isSelecting) {
    event.preventDefault();
  }
}

// Initialize: Check if selection mode should be active on page load
// (This handles cases where the extension is activated before page fully loads)
function initializeContentScript() {
  // Send ready message to service worker
  try {
    chrome.runtime.sendMessage({
      action: 'contentScriptReady',
      url: window.location.href
    });
  } catch (error) {
    console.warn('Could not send ready message:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Handle page unload to clean up
window.addEventListener('beforeunload', () => {
  deactivateSelectionMode();
  hideLoadingIndicator();
});

console.log('Selection overlay content script loaded');
