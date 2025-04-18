// Global variable to track the active state
let bionicReadingActive = false;

// Selector for content areas that should have Bionic Reading applied
const contentSelectors = 'article, main, section, p, .article, .post, .content, div > p, .entry-content, .page-content, .post-content, .entry, .blog-post, .blog-entry, .text-content, .body-content, .main-content';

// Store original content to restore when toggling off
const originalContent = new Map();

// Debug mode for troubleshooting
const DEBUG = true;

// Function to log debug messages
function debugLog(...args) {
  if (DEBUG) {
    console.log('[Bionic Reading]', ...args);
  }
}

// Function to toggle Bionic Reading
function toggleBionicReading() {
  bionicReadingActive = !bionicReadingActive;
  
  debugLog('Toggling Bionic Reading:', bionicReadingActive ? 'ON' : 'OFF');
  
  if (bionicReadingActive) {
    applyBionicReading();
  } else {
    restoreOriginalContent();
  }
  
  // Notify background script about the state change
  chrome.runtime.sendMessage({
    action: "updateIcon",
    active: bionicReadingActive
  });
  
  return { active: bionicReadingActive };
}

// Function to restore original content when toggling off
function restoreOriginalContent() {
  try {
    debugLog('Restoring original content, items:', originalContent.size);
    
    // Remove all bionic reading styles
    const bionicElements = document.querySelectorAll('.bionic-reading-enhanced');
    bionicElements.forEach(element => {
      // Get the original text content
      const originalText = element.getAttribute('data-original-text');
      if (originalText) {
        // Create a text node with the original content
        const textNode = document.createTextNode(originalText);
        // Replace the enhanced element with the original text
        element.parentNode.replaceChild(textNode, element);
      }
    });
    
    // Clear the map
    originalContent.clear();
    
    debugLog('Original content restored');
  } catch (error) {
    console.error("Error restoring original content:", error);
    notifyError("Failed to restore original content: " + error.message);
  }
}

// Function to apply Bionic Reading to text
function applyBionicReading() {
  try {
    debugLog('Applying Bionic Reading effect');
    
    // Find all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip empty text nodes
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if parent is a script, style, or other non-content element
          const parent = node.parentNode;
          if (!parent || shouldSkipElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip very short text
          if (node.textContent.trim().length < 3) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    // Process each text node
    let processedCount = 0;
    let currentNode;
    const nodesToProcess = [];
    
    // Collect all nodes first to avoid live DOM issues
    while (currentNode = walker.nextNode()) {
      nodesToProcess.push(currentNode);
    }
    
    debugLog('Found text nodes to process:', nodesToProcess.length);
    
    // Process each node
    nodesToProcess.forEach(node => {
      try {
        const enhancedNode = enhanceTextNode(node);
        if (enhancedNode) {
          processedCount++;
        }
      } catch (nodeError) {
        console.error("Error processing node:", nodeError, node);
      }
    });
    
    debugLog('Processed text nodes:', processedCount);
    
    if (processedCount === 0) {
      notifyError("Could not process any content on this page");
    }
  } catch (error) {
    console.error("Error applying Bionic Reading:", error);
    notifyError("Failed to apply Bionic Reading: " + error.message);
  }
}

// Function to enhance a single text node with Bionic Reading
function enhanceTextNode(textNode) {
  if (!textNode || !textNode.textContent || !textNode.parentNode) {
    return null;
  }
  
  const text = textNode.textContent.trim();
  if (!text) {
    return null;
  }
  
  // Create a span to hold the enhanced text
  const span = document.createElement('span');
  span.className = 'bionic-reading-enhanced';
  span.setAttribute('data-original-text', text);
  
  // Apply Bionic Reading to the text
  span.innerHTML = bionicifyText(text);
  
  // Replace the text node with our enhanced span
  textNode.parentNode.replaceChild(span, textNode);
  
  return span;
}

// Check if an element should be skipped
function shouldSkipElement(element) {
  if (!element || !element.tagName) return true;
  
  const tag = element.tagName.toLowerCase();
  
  // Skip these elements entirely
  const skipTags = ['script', 'style', 'svg', 'canvas', 'video', 'audio', 'iframe', 'code', 'pre', 'noscript', 'head', 'meta', 'link'];
  if (skipTags.includes(tag)) return true;
  
  // Skip interactive elements
  if (isInteractiveElement(element)) return true;
  
  // Skip elements with certain classes or attributes
  if (element.classList && 
      (element.classList.contains('no-bionic') || 
       element.classList.contains('code') || 
       element.classList.contains('highlight') ||
       element.classList.contains('bionic-reading-enhanced'))) {
    return true;
  }
  
  return false;
}

// Check if an element is interactive (input, button, etc.)
function isInteractiveElement(element) {
  if (!element || !element.tagName) return false;
  
  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'button' || tag === 'select' || 
         tag === 'textarea' || tag === 'a' ||
         element.getAttribute('contenteditable') === 'true';
}

// Apply Bionic Reading effect to text
function bionicifyText(text) {
  if (!text) return '';
  
  try {
    // Split text into words, preserving spaces and punctuation
    return text.replace(/(\S+)(\s*)/g, (match, word, space) => {
      // Skip very short words
      if (word.length <= 1) return match;
      
      const length = word.length;
      let boldLength = Math.ceil(length * 0.4); // Bold ~40% of each word
      
      // Ensure reasonable bolding (1-4 characters)
      boldLength = Math.max(1, Math.min(4, boldLength));
      
      const bolded = word.substring(0, boldLength);
      const rest = word.substring(boldLength);
      
      // Use a span with font-weight instead of strong tag
      return `<span style="font-weight:bold">${bolded}</span>${rest}${space}`;
    });
  } catch (error) {
    console.error("Error bionicifying text:", error, text);
    return text; // Return original text if there's an error
  }
}

// Function to notify errors
function notifyError(message) {
  console.error("[Bionic Reading] Error:", message);
  chrome.runtime.sendMessage({
    action: "error",
    message: message
  });
}

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message:', message);
  
  if (message.action === "toggle") {
    const response = toggleBionicReading();
    debugLog('Sending response:', response);
    sendResponse(response);
  } else if (message.action === "getState") {
    const response = { active: bionicReadingActive };
    debugLog('Sending state:', response);
    sendResponse(response);
  } else if (message.action === "debug") {
    // Add a debug action to check if the content script is loaded
    const textNodes = countTextNodes();
    const response = {
      initialized: true,
      active: bionicReadingActive,
      textNodes: textNodes,
      url: window.location.href
    };
    debugLog('Sending debug info:', response);
    sendResponse(response);
  }
  return true;
});

// Function to count text nodes for debugging
function countTextNodes() {
  let count = 0;
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
  );
  
  while (walker.nextNode()) {
    count++;
  }
  
  return count;
}

// Set up MutationObserver to handle dynamically loaded content
const observer = new MutationObserver(mutations => {
  if (bionicReadingActive) {
    let newTextNodes = 0;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          // Process only element nodes
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Find all text nodes in this new element
            const walker = document.createTreeWalker(
              node,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(textNode) {
                  if (!textNode.textContent.trim()) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  const parent = textNode.parentNode;
                  if (!parent || shouldSkipElement(parent)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            );
            
            // Process each text node
            let textNode;
            while (textNode = walker.nextNode()) {
              enhanceTextNode(textNode);
              newTextNodes++;
            }
          }
        });
      }
    });
    
    if (newTextNodes > 0) {
      debugLog('Processed', newTextNodes, 'new text nodes from dynamic content');
    }
  }
});

// Start observing the entire document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Log that the content script has loaded
debugLog('Content script loaded and ready');

// Add a simple way to test the extension via the console
window.bionicReading = {
  toggle: toggleBionicReading,
  getState: () => bionicReadingActive,
  debug: () => {
    const textNodes = countTextNodes();
    console.log('Text nodes found:', textNodes);
    return {
      active: bionicReadingActive,
      textNodes: textNodes,
      url: window.location.href
    };
  }
};

// Send a message to indicate the content script is ready
chrome.runtime.sendMessage({
  action: "contentScriptReady",
  url: window.location.href
}); 