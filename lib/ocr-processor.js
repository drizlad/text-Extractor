// OCR Processor module for text extraction from images
// Uses Tesseract.js for client-side OCR processing

/**
 * OCR Processor class
 * Handles text extraction from images using Tesseract.js
 */
class OCRProcessor {
  constructor() {
    this.tesseract = null;
    this.isInitialized = false;
    this.defaultLanguages = ['eng', 'spa', 'fra']; // English, Spanish, French
    this.currentLanguage = 'eng+spa+fra'; // Default to all three languages
    this.workerCache = new Map(); // Cache workers for performance
    this.performanceMetrics = {
      avgProcessingTime: 0,
      totalImagesProcessed: 0
    };
  }

  /**
   * Initialize Tesseract.js with multiple language support
   * @param {string} lang - Language code (eng, spa, fra, or combination like 'eng+spa+fra'). If not provided, loads from storage.
   * @returns {Promise<void>}
   */
  async initialize(lang = null) {
    try {
      // Load language preference from storage if not provided
      if (!lang) {
        lang = await this.loadLanguagePreference();
        // If no preference found, use default
        if (!lang) {
          lang = 'eng+spa+fra';
        }
      }

      // Check if Tesseract is available
      if (typeof Tesseract === 'undefined') {
        // Try to load Tesseract from CDN if not available
        await this.loadTesseractFromCDN();
      }

      this.tesseract = Tesseract;
      this.currentLanguage = lang;
      this.isInitialized = true;

      // Pre-warm worker for better performance (optional, only for frequently used languages)
      if (this.currentLanguage === 'eng+spa+fra' || this.currentLanguage === 'eng') {
        // Pre-warm in background (don't await to avoid blocking initialization)
        setTimeout(() => {
          this.preWarmWorker(this.currentLanguage).catch(console.warn);
        }, 100);
      }

      // OCR processor initialized
    } catch (error) {
      console.error('Error initializing OCR Processor:', error);
      throw new Error('Failed to initialize OCR: ' + error.message);
    }
  }

  /**
   * Pre-warm worker for better performance
   * @param {string} lang - Language code
   * @returns {Promise<void>}
   */
  async preWarmWorker(lang) {
    try {
      if (this.workerCache.has(lang)) {
        return; // Already cached
      }

      console.log('Pre-warming OCR worker for language:', lang);
      const worker = await Tesseract.createWorker(lang);
      this.workerCache.set(lang, worker);

      // Terminate after 5 minutes to free memory
      setTimeout(() => {
        if (this.workerCache.has(lang)) {
          this.workerCache.get(lang).terminate();
          this.workerCache.delete(lang);
        }
      }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      console.warn('Failed to pre-warm OCR worker:', error);
    }
  }

  /**
   * Initialize with all default languages (English, Spanish, French)
   * @returns {Promise<void>}
   */
  async initializeWithDefaultLanguages() {
    const combinedLang = this.defaultLanguages.join('+');
    return this.initialize(combinedLang);
  }

  /**
   * Load Tesseract.js from CDN if not already loaded
   * @returns {Promise<void>}
   */
  async loadTesseractFromCDN() {
    return new Promise((resolve, reject) => {
      if (typeof Tesseract !== 'undefined') {
        resolve();
        return;
      }

      // Load Tesseract.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
      script.onload = () => {
        console.log('Tesseract.js loaded from CDN');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Tesseract.js from CDN'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Preprocess image for better OCR accuracy
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} imageSource - Image to preprocess
   * @param {Object} options - Preprocessing options
   * @param {number} options.maxWidth - Maximum width (default: 2000)
   * @param {number} options.maxHeight - Maximum height (default: 2000)
   * @param {boolean} options.grayscale - Convert to grayscale (default: true)
   * @param {boolean} options.enhanceContrast - Enhance contrast (default: true)
   * @returns {HTMLCanvasElement} Preprocessed canvas
   */
  preprocessImage(imageSource, options = {}) {
    const {
      maxWidth = 2000,
      maxHeight = 2000,
      grayscale = true,
      enhanceContrast = true
    } = options;

    // Create canvas
    const canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    // Determine source dimensions
    let sourceWidth, sourceHeight;
    if (imageSource instanceof HTMLImageElement) {
      sourceWidth = imageSource.naturalWidth || imageSource.width;
      sourceHeight = imageSource.naturalHeight || imageSource.height;
    } else if (imageSource instanceof HTMLCanvasElement) {
      sourceWidth = imageSource.width;
      sourceHeight = imageSource.height;
    } else if (imageSource instanceof ImageData) {
      sourceWidth = imageSource.width;
      sourceHeight = imageSource.height;
    } else {
      throw new Error('Unsupported image source type');
    }

    // Calculate scaling to fit within max dimensions while maintaining aspect ratio
    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    ctx = canvas.getContext('2d');

    // Draw image to canvas (with scaling if needed)
    if (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLCanvasElement) {
      ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
    } else if (imageSource instanceof ImageData) {
      // Create temporary canvas for ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sourceWidth;
      tempCanvas.height = sourceHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageSource, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }

    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply preprocessing
    if (grayscale || enhanceContrast) {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (grayscale) {
          // Convert to grayscale using luminance formula
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }

        if (enhanceContrast) {
          // Simple contrast enhancement
          const factor = 1.2; // Contrast factor
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = Math.min(255, Math.max(0, avg + (data[i] - avg) * factor));
          data[i + 1] = Math.min(255, Math.max(0, avg + (data[i + 1] - avg) * factor));
          data[i + 2] = Math.min(255, Math.max(0, avg + (data[i + 2] - avg) * factor));
        }
      }

      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
  }

  /**
   * Extract text from an image using OCR
   * @param {string|ImageData|HTMLImageElement|HTMLCanvasElement} imageSource - Image source (data URL, ImageData, or image element)
   * @param {Object} options - OCR options
   * @param {string} options.lang - Language code (default: current language)
   * @param {boolean} options.preprocess - Whether to preprocess image (default: true)
   * @param {Object} options.preprocessOptions - Preprocessing options
   * @returns {Promise<Object>} OCR result with text and confidence
   */
  async extractText(imageSource, options = {}) {
    if (!this.isInitialized) {
      await this.initialize(options.lang || this.currentLanguage);
    }

    const lang = options.lang || this.currentLanguage;
    const shouldPreprocess = options.preprocess !== false; // Default to true
    const preprocessOptions = options.preprocessOptions || {};

    try {
      console.log('Starting OCR processing...');
      const startTime = Date.now();

      // Validate image source
      if (!imageSource) {
        throw new Error('Invalid image source: image source is null or undefined');
      }

      // Preprocess image if requested
      let processedImage = imageSource;
      if (shouldPreprocess) {
        try {
          // Convert image source to canvas if needed
          if (typeof imageSource === 'string') {
            // It's a data URL or image URL - load it first
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Set timeout for image loading
            const loadTimeout = 10000; // 10 seconds
            const loadPromise = new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Image loading timeout'));
              }, loadTimeout);
              
              img.onload = () => {
                clearTimeout(timeout);
                resolve();
              };
              img.onerror = (error) => {
                clearTimeout(timeout);
                reject(new Error('Failed to load image: ' + (error.message || 'Unknown error')));
              };
              img.src = imageSource;
            });
            
            await loadPromise;
            
            // Validate loaded image
            if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
              throw new Error('Invalid image: image failed to load or has zero dimensions');
            }
            
            processedImage = this.preprocessImage(img, preprocessOptions);
          } else if (imageSource instanceof HTMLImageElement) {
            // Validate image element
            if (!imageSource.complete || imageSource.naturalWidth === 0 || imageSource.naturalHeight === 0) {
              throw new Error('Invalid image element: image not loaded or has zero dimensions');
            }
            processedImage = this.preprocessImage(imageSource, preprocessOptions);
          } else if (imageSource instanceof HTMLCanvasElement) {
            // Validate canvas
            if (imageSource.width === 0 || imageSource.height === 0) {
              throw new Error('Invalid canvas: canvas has zero dimensions');
            }
            processedImage = this.preprocessImage(imageSource, preprocessOptions);
          } else if (imageSource instanceof ImageData) {
            // Validate ImageData
            if (imageSource.width === 0 || imageSource.height === 0) {
              throw new Error('Invalid ImageData: ImageData has zero dimensions');
            }
            processedImage = this.preprocessImage(imageSource, preprocessOptions);
          } else {
            throw new Error('Unsupported image source type: ' + typeof imageSource);
          }
        } catch (preprocessError) {
          console.error('Image preprocessing error:', preprocessError);
          throw new Error('Image preprocessing failed: ' + preprocessError.message);
        }
      }

      // Validate processed image
      if (!processedImage) {
        throw new Error('Processed image is null or undefined');
      }

      // Validate language code
      if (!lang || typeof lang !== 'string') {
        throw new Error('Invalid language code: ' + lang);
      }

      // Set timeout for OCR processing (30 seconds)
      const ocrTimeout = 30000;
      const ocrPromise = Tesseract.recognize(processedImage, lang, {
        logger: (m) => {
          // Log progress for debugging
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
          // Log errors from Tesseract
          if (m.status === 'error') {
            console.error('Tesseract error:', m);
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('OCR processing timeout: exceeded ' + ocrTimeout + 'ms'));
        }, ocrTimeout);
      });

      const result = await Promise.race([ocrPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;
      console.log(`OCR completed in ${processingTime}ms`);

      // Validate OCR result
      if (!result || !result.data) {
        throw new Error('Invalid OCR result: result data is missing');
      }

      // Check if text was found
      const extractedText = result.data.text || '';
      if (!extractedText.trim()) {
        console.warn('OCR completed but no text was found in the image');
        // Return empty result instead of throwing error
        return {
          text: '',
          confidence: 0,
          words: [],
          lines: [],
          paragraphs: [],
          processingTime: processingTime,
          warning: 'No text found in image'
        };
      }

      return {
        text: extractedText,
        confidence: result.data.confidence || 0,
        words: result.data.words || [],
        lines: result.data.lines || [],
        paragraphs: result.data.paragraphs || [],
        processingTime: processingTime
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'OCR processing failed';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for specific error types
      if (errorMessage.includes('timeout')) {
        errorMessage = 'OCR processing timed out. The image may be too large or complex.';
      } else if (errorMessage.includes('load')) {
        errorMessage = 'Failed to load image. The image may be corrupted or inaccessible.';
      } else if (errorMessage.includes('language')) {
        errorMessage = 'Invalid language code. Please select a valid language.';
      } else if (errorMessage.includes('dimensions') || errorMessage.includes('zero')) {
        errorMessage = 'Invalid image: image has zero dimensions or failed to load.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Extract text from multiple images
   * @param {Array} imageSources - Array of image sources
   * @param {Object} options - OCR options
   * @returns {Promise<Array>} Array of OCR results
   */
  async extractTextFromMultiple(imageSources, options = {}) {
    const results = [];
    
    for (const imageSource of imageSources) {
      try {
        const result = await this.extractText(imageSource, options);
        results.push(result);
      } catch (error) {
        console.error('Error processing image:', error);
        results.push({
          text: '',
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Set the OCR language
   * @param {string} lang - Language code (eng, spa, fra, or combination)
   * @param {boolean} save - Whether to save to storage (default: true)
   */
  async setLanguage(lang, save = true) {
    this.currentLanguage = lang;
    // Reinitialize if already initialized
    if (this.isInitialized) {
      this.isInitialized = false;
    }
    
    // Save to chrome.storage if available
    if (save && typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await chrome.storage.local.set({ ocrLanguage: lang });
        console.log('Language preference saved:', lang);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  }

  /**
   * Load language preference from storage
   * @returns {Promise<string>} Language code
   */
  async loadLanguagePreference() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await chrome.storage.local.get('ocrLanguage');
        if (result.ocrLanguage) {
          this.currentLanguage = result.ocrLanguage;
          console.log('Language preference loaded:', result.ocrLanguage);
          return result.ocrLanguage;
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    }
    // Return default
    return this.currentLanguage;
  }

  /**
   * Get language display name
   * @param {string} langCode - Language code
   * @returns {string} Display name
   */
  getLanguageDisplayName(langCode) {
    const languageNames = {
      'eng': 'English',
      'spa': 'Spanish',
      'fra': 'French',
      'eng+spa+fra': 'All Languages',
      'eng+spa': 'English + Spanish',
      'eng+fra': 'English + French',
      'spa+fra': 'Spanish + French'
    };
    return languageNames[langCode] || langCode;
  }

  /**
   * Get all available language options
   * @returns {Array<Object>} Array of language options with code and display name
   */
  getLanguageOptions() {
    return [
      { code: 'eng', name: 'English' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'eng+spa', name: 'English + Spanish' },
      { code: 'eng+fra', name: 'English + French' },
      { code: 'spa+fra', name: 'Spanish + French' },
      { code: 'eng+spa+fra', name: 'All Languages' }
    ];
  }

  /**
   * Get available languages
   * @returns {Array<string>} Array of language codes
   */
  getAvailableLanguages() {
    return this.defaultLanguages;
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Check if OCR processor is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.tesseract !== null;
  }
}

// Create singleton instance
const ocrProcessor = new OCRProcessor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ocrProcessor;
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.OCRProcessor = ocrProcessor;
}
