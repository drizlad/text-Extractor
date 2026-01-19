// Text Extractor Popup JavaScript
// Handles popup functionality, text display, editing, and copy operations

class TextExtractorPopup {
  constructor() {
    this.popup = null;
    this.isEditMode = false;
    this.originalText = '';
    this.extractedData = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Get DOM elements
    this.popup = document.getElementById('text-extractor-popup');
    this.editToggle = document.getElementById('edit-toggle');
    this.copyButton = document.getElementById('copy-button');
    this.closeButton = document.getElementById('close-button');
    this.textDisplay = document.getElementById('extracted-text');
    this.textInput = document.getElementById('text-input');
    this.saveEdit = document.getElementById('save-edit');
    this.cancelEdit = document.getElementById('cancel-edit');
    this.detailsToggle = document.getElementById('details-toggle');
    this.detailsContent = document.getElementById('details-content');
    this.statusText = document.getElementById('status-text');
    this.charCount = document.getElementById('char-count');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.errorIndicator = document.getElementById('error-indicator');
    this.errorText = document.getElementById('error-text');

    // Bind event handlers
    this.editToggle.addEventListener('click', () => this.toggleEditMode());
    this.copyButton.addEventListener('click', () => this.copyToClipboard());
    this.closeButton.addEventListener('click', () => this.closePopup());
    this.saveEdit.addEventListener('click', () => this.saveEdit());
    this.cancelEdit.addEventListener('click', () => this.cancelEdit());
    this.detailsToggle.addEventListener('click', () => this.toggleDetails());

    // Text input events
    this.textInput.addEventListener('input', () => this.updateCharCount());

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (this.isEditMode) {
          this.cancelEdit();
        } else {
          this.closePopup();
        }
      }
    });

    // Close on click outside popup
    document.addEventListener('click', (event) => {
      if (this.popup && !this.popup.contains(event.target)) {
        this.closePopup();
      }
    });

    // Popup initialized
  }

  /**
   * Show the popup with extracted text data
   * @param {Object} data - Extracted text data
   * @param {Object} position - Position coordinates {x, y, width, height}
   */
  show(data, position = null) {
    this.extractedData = data;

    // Position the popup
    this.positionPopup(position);

    // Display the text
    this.displayText(data.combinedText || data.selectableText || '');

    // Update status and details
    this.updateStatus('Ready');
    this.updateDetails(data);

    // Show errors if any
    if (data.errors && data.errors.length > 0) {
      this.showErrors(data.errors);
    }

    // Make popup visible
    if (this.popup) {
      this.popup.style.display = 'flex';
    }

    // Focus the copy button
    setTimeout(() => {
      if (this.copyButton) {
        this.copyButton.focus();
      }
    }, 100);
  }

  /**
   * Position the popup on screen
   * @param {Object} position - Position coordinates from selection
   */
  positionPopup(position) {
    if (!this.popup) return;

    // Default positioning (center of screen)
    let left = '50%';
    let top = '50%';
    let transform = 'translate(-50%, -50%)';

    if (position && position.viewportX !== undefined) {
      // Try to position near the selection area
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = 500; // Approximate popup width
      const popupHeight = 400; // Approximate popup height

      // Calculate preferred position (below and to the right of selection)
      let preferredLeft = position.viewportX + position.viewportWidth + 10;
      let preferredTop = position.viewportY;

      // Check if it fits on screen
      if (preferredLeft + popupWidth > viewportWidth) {
        // Try left side
        preferredLeft = position.viewportX - popupWidth - 10;
        if (preferredLeft < 0) {
          // Center horizontally
          preferredLeft = (viewportWidth - popupWidth) / 2;
        }
      }

      if (preferredTop + popupHeight > viewportHeight) {
        // Try above selection
        preferredTop = position.viewportY - popupHeight - 10;
        if (preferredTop < 0) {
          // Center vertically
          preferredTop = (viewportHeight - popupHeight) / 2;
        }
      }

      // Apply positioning
      left = `${preferredLeft}px`;
      top = `${preferredTop}px`;
      transform = 'none';
    }

    // Apply styles
    this.popup.style.position = 'fixed';
    this.popup.style.left = left;
    this.popup.style.top = top;
    this.popup.style.transform = transform;
    this.popup.style.zIndex = '2147483647'; // Maximum z-index
  }

  /**
   * Display text in the popup
   * @param {string} text - Text to display
   */
  displayText(text) {
    this.originalText = text || '';

    if (this.textDisplay) {
      this.textDisplay.textContent = this.originalText;
    }

    if (this.textInput) {
      this.textInput.value = this.originalText;
    }

    this.updateCharCount();
  }

  /**
   * Update character count display
   */
  updateCharCount() {
    const text = this.isEditMode ?
      (this.textInput ? this.textInput.value : '') :
      this.originalText;

    const count = text.length;
    if (this.charCount) {
      this.charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Toggle between display and edit modes
   */
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;

    const displayDiv = document.getElementById('text-display');
    const editorDiv = document.getElementById('text-editor');

    if (this.isEditMode) {
      // Switch to edit mode
      if (displayDiv) displayDiv.style.display = 'none';
      if (editorDiv) editorDiv.style.display = 'flex';
      if (this.textInput) this.textInput.focus();
      if (this.editToggle) {
        this.editToggle.classList.add('active');
        this.editToggle.querySelector('.button-text').textContent = 'Display';
      }
    } else {
      // Switch to display mode
      if (displayDiv) displayDiv.style.display = 'block';
      if (editorDiv) editorDiv.style.display = 'none';
      if (this.editToggle) {
        this.editToggle.classList.remove('active');
        this.editToggle.querySelector('.button-text').textContent = 'Edit';
      }
    }

    this.updateCharCount();
  }

  /**
   * Save edits and return to display mode
   */
  saveEdit() {
    if (!this.isEditMode || !this.textInput) return;

    const editedText = this.textInput.value;
    this.originalText = editedText;
    this.displayText(editedText);
    this.toggleEditMode();

    this.updateStatus('Text updated');
    setTimeout(() => this.updateStatus('Ready'), 2000);
  }

  /**
   * Cancel edits and return to display mode
   */
  cancelEdit() {
    if (!this.isEditMode) return;

    // Reset text input to original
    if (this.textInput) {
      this.textInput.value = this.originalText;
    }

    this.toggleEditMode();
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard() {
    const textToCopy = this.isEditMode ?
      (this.textInput ? this.textInput.value : '') :
      this.originalText;

    if (!textToCopy || !textToCopy.trim()) {
      this.updateStatus('No text to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);

      // Update button to show success
      const originalText = this.copyButton.querySelector('.button-text').textContent;
      this.copyButton.querySelector('.button-text').textContent = 'Copied!';
      this.copyButton.classList.add('success');

      setTimeout(() => {
        this.copyButton.querySelector('.button-text').textContent = originalText;
        this.copyButton.classList.remove('success');
      }, 2000);

      this.updateStatus('Text copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      this.updateStatus('Copy failed', 'error');
    }
  }

  /**
   * Close the popup
   */
  closePopup() {
    if (this.popup) {
      this.popup.style.display = 'none';
    }

    // Reset state
    this.isEditMode = false;
    this.extractedData = null;

    // Hide errors
    if (this.errorIndicator) {
      this.errorIndicator.style.display = 'none';
    }
  }

  /**
   * Update status text
   * @param {string} text - Status message
   * @param {string} type - Status type ('info', 'error', 'success')
   */
  updateStatus(text, type = 'info') {
    if (this.statusText) {
      this.statusText.textContent = text;
      this.statusText.className = `status-text status-${type}`;
    }
  }

  /**
   * Show loading state
   * @param {boolean} show - Whether to show loading
   */
  showLoading(show = true) {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show errors
   * @param {Array} errors - Array of error objects
   */
  showErrors(errors) {
    if (!this.errorIndicator || !this.errorText) return;

    const errorMessages = errors.map(error =>
      typeof error === 'string' ? error : (error.error || error.message || 'Unknown error')
    ).join('; ');

    this.errorText.textContent = errorMessages;
    this.errorIndicator.style.display = 'flex';
  }

  /**
   * Update details section
   * @param {Object} data - Extraction data
   */
  updateDetails(data) {
    const sourceElement = document.getElementById('extraction-source');
    const imagesCountElement = document.getElementById('images-count');
    const confidenceElement = document.getElementById('ocr-confidence');
    const timeElement = document.getElementById('processing-time');

    if (sourceElement) {
      const hasSelectable = data.selectableText && data.selectableText.trim();
      const hasOCR = data.ocrText && data.ocrText.trim();
      let source = 'None';
      if (hasSelectable && hasOCR) source = 'DOM + OCR';
      else if (hasSelectable) source = 'DOM only';
      else if (hasOCR) source = 'OCR only';
      sourceElement.textContent = source;
    }

    if (imagesCountElement) {
      const count = data.images ? data.images.length : 0;
      imagesCountElement.textContent = count;
    }

    if (confidenceElement) {
      if (data.images && data.images.length > 0) {
        const avgConfidence = data.images.reduce((sum, img) =>
          sum + (img.confidence || 0), 0) / data.images.length;
        confidenceElement.textContent = Math.round(avgConfidence) + '%';
      } else {
        confidenceElement.textContent = '-';
      }
    }

    if (timeElement) {
      // Calculate total processing time
      let totalTime = 0;
      if (data.images && data.images.length > 0) {
        totalTime = data.images.reduce((sum, img) =>
          sum + (img.processingTime || 0), 0);
      }
      timeElement.textContent = totalTime > 0 ? totalTime + 'ms' : '-';
    }
  }

  /**
   * Toggle details section visibility
   */
  toggleDetails() {
    if (!this.detailsContent) return;

    const isExpanded = this.detailsContent.style.display !== 'none';
    this.detailsContent.style.display = isExpanded ? 'none' : 'block';
    this.detailsToggle.setAttribute('aria-expanded', !isExpanded);

    // Update arrow rotation
    const arrow = this.detailsToggle.querySelector('.details-arrow');
    if (arrow) {
      arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  }
}

// Create popup instance when script loads
const textExtractorPopup = new TextExtractorPopup();

// Export for use in other contexts
if (typeof window !== 'undefined') {
  window.TextExtractorPopup = TextExtractorPopup;
  window.textExtractorPopup = textExtractorPopup;
}

console.log('Popup script loaded');
