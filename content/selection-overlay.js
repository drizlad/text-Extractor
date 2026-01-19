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
  if (message.action === 'activateSelectionMode') {
    activateSelectionMode();
    sendResponse({ success: true });
  } else if (message.action === 'deactivateSelectionMode') {
    deactivateSelectionMode();
    sendResponse({ success: true });
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
  
  // Create overlay container
  selectionOverlay = document.createElement('div');
  selectionOverlay.id = 'text-extractor-overlay';
  selectionOverlay.className = 'text-extractor-overlay';
  
  // Create selection box
  selectionBox = document.createElement('div');
  selectionBox.id = 'text-extractor-selection-box';
  selectionBox.className = 'text-extractor-selection-box';
  
  selectionOverlay.appendChild(selectionBox);
  document.body.appendChild(selectionOverlay);
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
}

/**
 * Handle mouse move event (update selection)
 */
function handleMouseMove(event) {
  if (!isSelectionModeActive || !isSelecting || !selectionBox) {
    return;
  }
  
  event.preventDefault();
  
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

      // Extract text using the text extractor utility
      const extractedData = await window.TextExtractor.extractTextFromSelection(selectionData);

      // Send extracted data to service worker
      chrome.runtime.sendMessage({
        action: 'textExtractionComplete',
        data: extractedData,
        selection: selectionData
      });

    } else {
      // Fallback: send basic selection data
      console.warn('Text extraction utilities not available, sending basic selection data');
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Selection mode will be activated via message from service worker
  });
}

console.log('Selection overlay content script loaded');
