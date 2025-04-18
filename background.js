// Debug mode for troubleshooting
const DEBUG = true;

// Function to log debug messages
function debugLog(...args) {
  if (DEBUG) {
    console.log('[Bionic Reading Background]', ...args);
  }
}

// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener(function(command) {
  if (command === "toggle-bionic-reading") {
    // Execute script in the active tab to toggle Bionic Reading
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        debugLog('No active tab found');
        return;
      }
      
      debugLog('Sending toggle message to tab:', tabs[0].id);
      
      chrome.tabs.sendMessage(tabs[0].id, {action: "toggle"}, function(response) {
        // Check if there was an error (content script might not be loaded)
        if (chrome.runtime.lastError) {
          debugLog('Error sending message:', chrome.runtime.lastError.message);
          
          // Try to inject the content script
          injectContentScript(tabs[0].id, () => {
            // Try again after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {action: "toggle"}, function(response) {
                if (response && response.active !== undefined) {
                  updateIcon(response.active);
                }
              });
            }, 100);
          });
          return;
        }
        
        // Update the icon based on the active state
        if (response && response.active !== undefined) {
          debugLog('Received response:', response);
          updateIcon(response.active);
        }
      });
    });
  }
});

// Function to inject the content script
function injectContentScript(tabId, callback) {
  debugLog('Injecting content script into tab:', tabId);
  
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: ['content.js']
  }).then(() => {
    debugLog('Content script injected successfully');
    if (callback) callback();
  }).catch(error => {
    debugLog('Error injecting content script:', error);
  });
}

// Listen for messages from content script to update the icon
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message:', message, 'from:', sender);
  
  if (message.action === "updateIcon") {
    updateIcon(message.active);
  } else if (message.action === "contentScriptReady") {
    debugLog('Content script is ready on:', message.url);
  } else if (message.action === "error") {
    debugLog('Error from content script:', message.message);
  }
  return true;
});

// Function to update the extension icon based on active state
function updateIcon(active) {
  debugLog('Updating icon to:', active ? 'active' : 'inactive');
  
  const iconPath = active ? 
    {
      "16": "icons/active-icon-16.png",
      "48": "icons/active-icon-48.png",
      "128": "icons/active-icon-128.png"
    } : 
    {
      "16": "icons/inactive-icon-16.png",
      "48": "icons/inactive-icon-48.png",
      "128": "icons/inactive-icon-128.png"
    };
  
  chrome.action.setIcon({path: iconPath});
}

// Listen for tab updates to ensure content script is loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    debugLog('Tab updated:', tabId, 'URL:', tab.url);
    
    // Check if content script is loaded by sending a message
    chrome.tabs.sendMessage(tabId, {action: "debug"}, function(response) {
      if (chrome.runtime.lastError) {
        debugLog('Content script not loaded in tab:', tabId, chrome.runtime.lastError.message);
        
        // Inject content script if not loaded
        injectContentScript(tabId);
      } else {
        debugLog('Content script already loaded in tab:', tabId);
      }
    });
  }
});

// Log that the background script has loaded
debugLog('Background script loaded and ready'); 