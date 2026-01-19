// Utility functions for Text Extractor extension
// Provides error handling, text processing, and common operations

/**
 * Error handling utilities
 */
const ErrorHandler = {
  /**
   * Log error with context
   * @param {Error|string} error - Error object or message
   * @param {string} context - Context where error occurred
   * @param {Object} extraData - Additional data to log
   */
  logError(error, context = '', extraData = {}) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : '';

    console.error(`[TextExtractor] ${context}:`, errorMessage, {
      ...extraData,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  },

  /**
   * Create standardized error object
   * @param {string} message - Error message
   * @param {string} type - Error type/category
   * @param {Object} details - Additional error details
   * @returns {Object} Standardized error object
   */
  createError(message, type = 'unknown', details = {}) {
    return {
      message,
      type,
      details,
      timestamp: Date.now(),
      userFriendlyMessage: this.getUserFriendlyMessage(message, type)
    };
  },

  /**
   * Get user-friendly error message
   * @param {string} message - Raw error message
   * @param {string} type - Error type
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(message, type) {
    const friendlyMessages = {
      'ocr_failure': 'Text extraction from image failed. The image may be too small, corrupted, or contain no readable text.',
      'image_load_failure': 'Failed to load image. The image may be inaccessible or corrupted.',
      'clipboard_failure': 'Failed to copy text to clipboard. Please try selecting and copying manually.',
      'initialization_failure': 'Extension failed to initialize properly. Please reload the page and try again.',
      'timeout': 'Operation timed out. The content may be too large or the network connection is slow.',
      'permission_denied': 'Permission denied. Please check extension permissions in Chrome settings.',
      'network_error': 'Network error. Please check your internet connection.',
      'unknown': 'An unexpected error occurred. Please try again.'
    };

    // Check for specific error patterns
    if (message.includes('timeout') || message.includes('timed out')) {
      return friendlyMessages.timeout;
    }
    if (message.includes('clipboard') || message.includes('copy')) {
      return friendlyMessages.clipboard_failure;
    }
    if (message.includes('load') || message.includes('fetch')) {
      return friendlyMessages.image_load_failure;
    }
    if (message.includes('permission') || message.includes('denied')) {
      return friendlyMessages.permission_denied;
    }

    return friendlyMessages[type] || friendlyMessages.unknown;
  },

  /**
   * Handle async operation with timeout
   * @param {Promise} promise - Promise to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} timeoutMessage - Message for timeout error
   * @returns {Promise} Promise with timeout
   */
  withTimeout(promise, timeoutMs = 10000, timeoutMessage = 'Operation timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      })
    ]);
  }
};

/**
 * Text processing utilities
 */
const TextProcessor = {
  /**
   * Clean and normalize extracted text
   * @param {string} text - Raw text
   * @param {Object} options - Processing options
   * @returns {string} Processed text
   */
  cleanText(text, options = {}) {
    if (!text || typeof text !== 'string') return '';

    let processed = text;

    // Normalize line endings
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Handle excessive whitespace if requested
    if (options.normalizeWhitespace !== false) {
      // Replace multiple spaces with single space (but preserve indentation)
      processed = processed.replace(/[ \t]+/g, ' ');
      // Remove trailing/leading whitespace from each line
      processed = processed.split('\n').map(line => line.trim()).join('\n');
    }

    // Remove excessive line breaks
    if (options.collapseLines !== false) {
      processed = processed.replace(/\n{3,}/g, '\n\n');
    }

    // Trim overall text
    processed = processed.trim();

    return processed;
  },

  /**
   * Count characters and words in text
   * @param {string} text - Text to analyze
   * @returns {Object} Statistics object
   */
  getTextStats(text) {
    if (!text || typeof text !== 'string') {
      return { characters: 0, words: 0, lines: 0 };
    }

    const characters = text.length;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const lines = text.split('\n').length;

    return { characters, words, lines };
  },

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add when truncated
   * @returns {string} Truncated text
   */
  truncate(text, maxLength = 1000, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Format text for display
   * @param {string} text - Text to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted text
   */
  formatForDisplay(text, options = {}) {
    if (!text) return '';

    let formatted = text;

    // Apply cleaning
    formatted = this.cleanText(formatted, options);

    // Truncate if requested
    if (options.maxLength) {
      formatted = this.truncate(formatted, options.maxLength);
    }

    return formatted;
  }
};

/**
 * DOM utilities
 */
const DOMUtils = {
  /**
   * Check if element is visible in viewport
   * @param {Element} element - DOM element
   * @returns {boolean} Whether element is visible
   */
  isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Get element by selector with timeout
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element>} Element or null
   */
  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  },

  /**
   * Create element from HTML string
   * @param {string} html - HTML string
   * @returns {Element} Created element
   */
  createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }
};

/**
 * Storage utilities for Chrome extension
 */
const StorageUtils = {
  /**
   * Get value from chrome.storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key not found
   * @returns {Promise<*>} Stored value or default
   */
  async get(key, defaultValue = null) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(key);
        return result[key] !== undefined ? result[key] : defaultValue;
      }
    } catch (error) {
      ErrorHandler.logError(error, `Failed to get storage key: ${key}`);
    }
    return defaultValue;
  },

  /**
   * Set value in chrome.storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [key]: value });
        return true;
      }
    } catch (error) {
      ErrorHandler.logError(error, `Failed to set storage key: ${key}`);
    }
    return false;
  },

  /**
   * Remove value from chrome.storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} Success status
   */
  async remove(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(key);
        return true;
      }
    } catch (error) {
      ErrorHandler.logError(error, `Failed to remove storage key: ${key}`);
    }
    return false;
  }
};

/**
 * Performance utilities
 */
const PerformanceUtils = {
  /**
   * Measure execution time of a function
   * @param {Function} fn - Function to measure
   * @param {...*} args - Arguments to pass to function
   * @returns {Promise<Object>} Result with execution time
   */
  async measureExecutionTime(fn, ...args) {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const endTime = performance.now();
      return {
        result,
        executionTime: endTime - startTime,
        success: true
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        error,
        executionTime: endTime - startTime,
        success: false
      };
    }
  },

  /**
   * Check if device has low memory
   * @returns {boolean} Whether device has limited memory
   */
  hasLowMemory() {
    // Check for various indicators of low memory
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && connection.effectiveType) {
      // Slow connections often indicate limited device capabilities
      return ['slow-2g', '2g'].includes(connection.effectiveType);
    }

    // Check device memory if available
    if ('deviceMemory' in navigator) {
      return navigator.deviceMemory < 4; // Less than 4GB RAM
    }

    return false;
  }
};

/**
 * Validation utilities
 */
const ValidationUtils = {
  /**
   * Validate selection coordinates
   * @param {Object} selection - Selection object
   * @returns {boolean} Whether selection is valid
   */
  isValidSelection(selection) {
    if (!selection || typeof selection !== 'object') return false;

    const required = ['viewportX', 'viewportY', 'viewportWidth', 'viewportHeight'];
    return required.every(prop =>
      typeof selection[prop] === 'number' &&
      !isNaN(selection[prop]) &&
      selection[prop] >= 0
    );
  },

  /**
   * Validate extracted text data
   * @param {Object} data - Extracted data object
   * @returns {boolean} Whether data is valid
   */
  isValidExtractedData(data) {
    return data && typeof data === 'object' &&
           (data.combinedText || data.selectableText || data.ocrText);
  },

  /**
   * Validate image source
   * @param {*} imageSource - Image source to validate
   * @returns {boolean} Whether image source is valid
   */
  isValidImageSource(imageSource) {
    if (!imageSource) return false;

    if (typeof imageSource === 'string') {
      // Check if it's a valid data URL or HTTP URL
      return imageSource.startsWith('data:') ||
             imageSource.startsWith('http://') ||
             imageSource.startsWith('https://');
    }

    if (imageSource instanceof HTMLImageElement) {
      return imageSource.complete && imageSource.naturalWidth > 0 && imageSource.naturalHeight > 0;
    }

    if (imageSource instanceof HTMLCanvasElement) {
      return imageSource.width > 0 && imageSource.height > 0;
    }

    if (imageSource instanceof ImageData) {
      return imageSource.width > 0 && imageSource.height > 0;
    }

    return false;
  }
};

// Export utilities
const Utils = {
  ErrorHandler,
  TextProcessor,
  DOMUtils,
  StorageUtils,
  PerformanceUtils,
  ValidationUtils,

  // Convenience methods
  logError: ErrorHandler.logError.bind(ErrorHandler),
  createError: ErrorHandler.createError.bind(ErrorHandler),
  cleanText: TextProcessor.cleanText.bind(TextProcessor),
  getTextStats: TextProcessor.getTextStats.bind(TextProcessor)
};

// Make available globally for extension scripts
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
