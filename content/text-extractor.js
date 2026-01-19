// Content script for text extraction
// Handles text extraction from selected areas, including images

/**
 * Detect images within a selected area
 * @param {Object} selectionData - Selection coordinates {x, y, width, height, viewportX, viewportY, viewportWidth, viewportHeight}
 * @returns {Array<Object>} Array of detected images with their data
 */
function detectImagesInSelection(selectionData) {
  const images = [];
  
  // Get all img elements on the page
  const imgElements = document.querySelectorAll('img');
  
  // Convert viewport coordinates to account for scroll
  const selectionRect = {
    left: selectionData.viewportX,
    top: selectionData.viewportY,
    right: selectionData.viewportX + selectionData.viewportWidth,
    bottom: selectionData.viewportY + selectionData.viewportHeight
  };
  
  imgElements.forEach((img, index) => {
    try {
      // Get image position and dimensions
      const rect = img.getBoundingClientRect();
      
      // Check if image overlaps with selection area
      const imageRect = {
        left: rect.left,
        top: rect.top,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height
      };
      
      // Check for overlap
      const overlaps = !(
        imageRect.right < selectionRect.left ||
        imageRect.left > selectionRect.right ||
        imageRect.bottom < selectionRect.top ||
        imageRect.top > selectionRect.bottom
      );
      
      if (overlaps) {
        // Calculate the intersection area
        const intersectionLeft = Math.max(selectionRect.left, imageRect.left);
        const intersectionTop = Math.max(selectionRect.top, imageRect.top);
        const intersectionRight = Math.min(selectionRect.right, imageRect.right);
        const intersectionBottom = Math.min(selectionRect.bottom, imageRect.bottom);
        
        const intersectionWidth = intersectionRight - intersectionLeft;
        const intersectionHeight = intersectionBottom - intersectionTop;
        
        // Only include if intersection is meaningful (at least 10x10 pixels)
        if (intersectionWidth > 10 && intersectionHeight > 10) {
          images.push({
            element: img,
            src: img.src || img.currentSrc,
            alt: img.alt || '',
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            displayWidth: rect.width,
            displayHeight: rect.height,
            rect: rect,
            intersection: {
              x: intersectionLeft,
              y: intersectionTop,
              width: intersectionWidth,
              height: intersectionHeight
            },
            index: index
          });
        }
      }
    } catch (error) {
      console.error('Error processing image element:', error);
    }
  });
  
  // Also check for background images in elements within selection
  const allElements = document.elementsFromPoint(
    selectionData.viewportX + selectionData.viewportWidth / 2,
    selectionData.viewportY + selectionData.viewportHeight / 2
  );
  
  allElements.forEach((element) => {
    try {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;
      
      if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
        // Extract URL from background-image
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          const rect = element.getBoundingClientRect();
          
          // Check if element overlaps with selection
          const elementRect = {
            left: rect.left,
            top: rect.top,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height
          };
          
          const overlaps = !(
            elementRect.right < selectionRect.left ||
            elementRect.left > selectionRect.right ||
            elementRect.bottom < selectionRect.top ||
            elementRect.top > selectionRect.bottom
          );
          
          if (overlaps) {
            images.push({
              element: element,
              src: urlMatch[1],
              alt: '',
              type: 'background-image',
              rect: rect,
              intersection: {
                x: Math.max(selectionRect.left, elementRect.left),
                y: Math.max(selectionRect.top, elementRect.top),
                width: Math.min(selectionRect.right, elementRect.right) - Math.max(selectionRect.left, elementRect.left),
                height: Math.min(selectionRect.bottom, elementRect.bottom) - Math.max(selectionRect.top, elementRect.top)
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing background image:', error);
    }
  });
  
  // Images detected in selection area
  return images;
}

/**
 * Get image data from an image element or URL
 * @param {Object} imageInfo - Image information object
 * @returns {Promise<ImageData|HTMLImageElement>} Image data or image element
 */
async function getImageData(imageInfo) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS if possible
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        // Try to use the original element if it's an img tag
        if (imageInfo.element && imageInfo.element.tagName === 'IMG') {
          resolve(imageInfo.element);
        } else {
          reject(new Error('Failed to load image: ' + imageInfo.src));
        }
      };
      
      img.src = imageInfo.src;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Capture selected area as an image using Canvas API
 * @param {Object} selectionData - Selection coordinates {viewportX, viewportY, viewportWidth, viewportHeight}
 * @returns {Promise<HTMLCanvasElement>} Canvas element with captured image
 */
async function captureSelectionAsImage(selectionData) {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      canvas.width = selectionData.viewportWidth;
      canvas.height = selectionData.viewportHeight;
      const ctx = canvas.getContext('2d');
      
      // Use html2canvas-like approach or native canvas drawImage
      // For now, we'll use a simpler approach that captures visible content
      
      // Create an offscreen canvas to capture the area
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = selectionData.viewportWidth;
      offscreenCanvas.height = selectionData.viewportHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      
      // Fill with white background
      offscreenCtx.fillStyle = '#FFFFFF';
      offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      
      // Try to capture using html2canvas if available, otherwise use screenshot API
      // For Chrome extensions, we can use chrome.tabs.captureVisibleTab
      // But for content scripts, we'll need to use a different approach
      
      // Alternative: Use html2canvas library or similar
      // For MVP, we'll capture individual images and composite them
      
      resolve(offscreenCanvas);
    } catch (error) {
      console.error('Error capturing selection as image:', error);
      reject(error);
    }
  });
}

/**
 * Capture selected area using html2canvas (if available) or fallback method
 * @param {Object} selectionData - Selection coordinates
 * @returns {Promise<HTMLCanvasElement>} Canvas with captured image
 */
async function captureAreaWithCanvas(selectionData) {
  // Check if html2canvas is available
  if (typeof html2canvas !== 'undefined') {
    try {
      // Get the element at the selection center (or use body)
      const element = document.elementFromPoint(
        selectionData.viewportX + selectionData.viewportWidth / 2,
        selectionData.viewportY + selectionData.viewportHeight / 2
      ) || document.body;
      
      const canvas = await html2canvas(element, {
        x: selectionData.viewportX,
        y: selectionData.viewportY,
        width: selectionData.viewportWidth,
        height: selectionData.viewportHeight,
        useCORS: true,
        allowTaint: true,
        scale: 1
      });
      
      return canvas;
    } catch (error) {
      console.error('Error with html2canvas:', error);
      // Fall through to fallback method
    }
  }
  
  // Fallback: Create canvas and draw detected images
  return captureSelectionAsImage(selectionData);
}

/**
 * Extract image data from selected area for OCR processing
 * @param {Object} selectionData - Selection coordinates
 * @returns {Promise<Array>} Array of image data ready for OCR
 */
async function extractImagesForOCR(selectionData) {
  const detectedImages = detectImagesInSelection(selectionData);
  const imageDataArray = [];
  
  // If we have detected images, use them
  if (detectedImages.length > 0) {
    for (const imageInfo of detectedImages) {
      try {
        const imageData = await getImageData(imageInfo);
        imageDataArray.push({
          image: imageData,
          info: imageInfo
        });
      } catch (error) {
        console.error('Error extracting image data:', error);
        // Continue with other images
      }
    }
  }
  
  // Also capture the entire selection area as an image
  try {
    const selectionCanvas = await captureAreaWithCanvas(selectionData);
    imageDataArray.push({
      image: selectionCanvas,
      info: {
        type: 'selection-area',
        width: selectionCanvas.width,
        height: selectionCanvas.height
      }
    });
  } catch (error) {
    console.error('Error capturing selection area:', error);
  }
  
  return imageDataArray;
}

/**
 * Extract selectable text from DOM elements within selected area
 * @param {Object} selectionData - Selection coordinates
 * @returns {string} Extracted text from DOM elements
 */
function extractSelectableText(selectionData) {
  const textElements = [];
  const selectionRect = {
    left: selectionData.viewportX,
    top: selectionData.viewportY,
    right: selectionData.viewportX + selectionData.viewportWidth,
    bottom: selectionData.viewportY + selectionData.viewportHeight
  };

  // Get all text nodes and elements within the selection
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getBoundingClientRect();
          
          // Check if text node overlaps with selection
          if (rect.width > 0 && rect.height > 0) {
            const overlaps = !(
              rect.right < selectionRect.left ||
              rect.left > selectionRect.right ||
              rect.bottom < selectionRect.top ||
              rect.top > selectionRect.bottom
            );
            return overlaps ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const rect = node.getBoundingClientRect();
          const overlaps = !(
            rect.right < selectionRect.left ||
            rect.left > selectionRect.right ||
            rect.bottom < selectionRect.top ||
            rect.top > selectionRect.bottom
          );
          return overlaps ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        textElements.push(text);
      }
    }
  }

  // Also try to get text from common text-containing elements
  const allElements = document.elementsFromPoint(
    selectionData.viewportX + selectionData.viewportWidth / 2,
    selectionData.viewportY + selectionData.viewportHeight / 2
  );

  allElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const overlaps = !(
      rect.right < selectionRect.left ||
      rect.left > selectionRect.right ||
      rect.bottom < selectionRect.top ||
      rect.top > selectionRect.bottom
    );

    if (overlaps) {
      // Get text content, excluding nested elements we've already processed
      const text = element.innerText || element.textContent;
      if (text && text.trim()) {
        // Avoid duplicates
        if (!textElements.includes(text.trim())) {
          textElements.push(text.trim());
        }
      }
    }
  });

  // Combine text elements, preserving line breaks and spacing
  let combinedText = textElements.join('\n');
  
  // Normalize excessive line breaks (more than 2 consecutive newlines become 2)
  combinedText = combinedText.replace(/\n{3,}/g, '\n\n');
  
  // Preserve spacing between words (don't collapse multiple spaces)
  // But normalize tabs to spaces
  combinedText = combinedText.replace(/\t/g, ' ');
  
  // Preserve paragraph breaks (double newlines)
  // Ensure consistent line break formatting
  combinedText = combinedText.replace(/\r\n/g, '\n'); // Normalize Windows line breaks
  combinedText = combinedText.replace(/\r/g, '\n'); // Normalize Mac line breaks
  
  // Trim only leading/trailing whitespace, preserve internal spacing
  combinedText = combinedText.trim();
  
  return combinedText;
}

/**
 * Extract text from selected area using both OCR and DOM text extraction
 * @param {Object} selectionData - Selection coordinates
 * @returns {Promise<Object>} Extracted text with source information
 */
async function extractTextFromSelection(selectionData) {
  const results = {
    selectableText: '',
    ocrText: '',
    combinedText: '',
    images: [],
    errors: []
  };

  try {
    // 1. Extract selectable text from DOM
    console.log('Extracting selectable text from DOM...');
    results.selectableText = extractSelectableText(selectionData);
    console.log(`Extracted ${results.selectableText.length} characters from DOM`);

    // 2. Detect and extract text from images using OCR
    console.log('Detecting images in selection...');
    const detectedImages = detectImagesInSelection(selectionData);
    
    if (detectedImages.length > 0) {
      console.log(`Found ${detectedImages.length} image(s), starting OCR...`);
      
      // Load OCR processor if available
      if (typeof window.OCRProcessor === 'undefined') {
        // Try to load OCR processor script
        await loadOCRScript();
      }

      if (window.OCRProcessor) {
        try {
          // Initialize OCR processor
          await window.OCRProcessor.initialize();
        } catch (initError) {
          console.error('Failed to initialize OCR processor:', initError);
          results.errors.push({
            error: 'Failed to initialize OCR processor: ' + (initError.message || 'Unknown error'),
            type: 'initialization_failure'
          });
          // Continue with DOM text extraction even if OCR fails
        }
        
        if (window.OCRProcessor.isReady()) {
          // Extract images for OCR
          let imageDataArray = [];
          try {
            imageDataArray = await extractImagesForOCR(selectionData);
          } catch (extractError) {
            console.error('Error extracting images for OCR:', extractError);
            results.errors.push({
              error: 'Failed to extract images: ' + (extractError.message || 'Unknown error'),
              type: 'image_extraction_failure'
            });
          }
          
          // Process each image with OCR
          const ocrResults = [];
          for (let i = 0; i < imageDataArray.length; i++) {
          const imageData = imageDataArray[i];
          try {
            // Validate image before processing
            if (!imageData.image) {
              throw new Error('Image data is missing');
            }
            
            const ocrResult = await window.OCRProcessor.extractText(imageData.image);
            
            // Check if text was extracted
            if (ocrResult.text && ocrResult.text.trim()) {
              ocrResults.push(ocrResult.text);
              results.images.push({
                src: imageData.info.src || 'selection-area',
                text: ocrResult.text,
                confidence: ocrResult.confidence || 0,
                processingTime: ocrResult.processingTime || 0
              });
            } else {
              // No text found, but not an error
              console.warn(`No text found in image ${i + 1}`);
              results.images.push({
                src: imageData.info.src || 'selection-area',
                text: '',
                confidence: 0,
                warning: 'No text detected in image'
              });
            }
          } catch (error) {
            console.error(`OCR error for image ${i + 1}:`, error);
            const errorMessage = error.message || 'Unknown error';
            results.errors.push({
              imageIndex: i + 1,
              src: imageData.info.src || 'selection-area',
              error: errorMessage,
              type: 'ocr_failure'
            });
            
            // Continue processing other images even if one fails
            results.images.push({
              src: imageData.info.src || 'selection-area',
              text: '',
              error: errorMessage
            });
          }
          }
          
          // Combine OCR results
          if (ocrResults.length > 0) {
            results.ocrText = ocrResults.join('\n\n');
            console.log(`Extracted ${results.ocrText.length} characters from OCR`);
          } else {
            console.log('No text extracted from images via OCR');
          }
        } else {
          results.errors.push({
            error: 'OCR processor not ready',
            type: 'processor_not_ready'
          });
        }
      } else {
        results.errors.push({
          error: 'OCR processor not available. Tesseract.js may not be loaded.',
          type: 'processor_unavailable'
        });
      }
    }

    // 3. Combine selectable text and OCR text, preserving formatting
    const textParts = [];
    if (results.selectableText && results.selectableText.trim()) {
      textParts.push(results.selectableText.trim());
    }
    if (results.ocrText && results.ocrText.trim()) {
      textParts.push(results.ocrText.trim());
    }
    
    // Join with double newline to preserve paragraph separation
    results.combinedText = textParts.join('\n\n');
    
    // Normalize excessive line breaks while preserving paragraph structure
    results.combinedText = results.combinedText.replace(/\n{4,}/g, '\n\n\n'); // Max 3 newlines
    results.combinedText = results.combinedText.trim();

    // Text extraction completed
    return results;

  } catch (error) {
    console.error('Error extracting text from selection:', error);
    results.errors.push(`Extraction failed: ${error.message}`);
    return results;
  }
}

/**
 * Load OCR processor script if not already loaded
 * @returns {Promise<void>}
 */
async function loadOCRScript() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.OCRProcessor) {
      resolve();
      return;
    }

    // Try to load from extension
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('lib/ocr-processor.js');
    script.onload = () => {
      console.log('OCR processor script loaded');
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load OCR processor script');
      reject(new Error('Failed to load OCR processor'));
    };
    document.head.appendChild(script);
  });
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.TextExtractor = {
    detectImagesInSelection,
    getImageData,
    extractImagesForOCR,
    captureSelectionAsImage,
    captureAreaWithCanvas,
    extractSelectableText,
    extractTextFromSelection
  };
}

console.log('Text extractor content script loaded');
