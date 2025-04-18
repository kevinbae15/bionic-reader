// DOM elements
const toggleButton = document.getElementById('toggle-button');
const errorMessageDiv = document.getElementById('error-message');
const statusIndicator = document.getElementById('status-indicator');

// Debug mode for troubleshooting - set to false for production
const DEBUG = false;

// Function to log debug messages
function debugLog(...args) {
  if (DEBUG) {
    console.log('[Bionic Reading Popup]', ...args);
  }
}

// Function to toggle Bionic Reading in the current tab
function toggleBionicReading() {
  debugLog('Toggle button clicked');
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showError("Could not find active tab");
      return;
    }
    
    debugLog('Sending toggle message to tab:', tabs[0].id);
    
    // Send a message to the content script
    chrome.tabs.sendMessage(tabs[0].id, {action: "toggle"}, function(response) {
      // Check for error
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message;
        debugLog('Error sending message:', errorMessage);
        showError("Could not communicate with the page. The extension may not have permission to run on this site.");
        updateStatus(false);
        return;
      }
      
      // Update button styling based on active state
      if (response && response.active !== undefined) {
        debugLog('Received response:', response);
        updateButtonState(response.active);
        updateStatus(true, response.active);
      } else {
        debugLog('Invalid response:', response);
        showError("Received invalid response from content script");
        updateStatus(false);
      }
    });
  });
}

// Function to update the button state based on whether Bionic Reading is active
function updateButtonState(active) {
  debugLog('Updating button state:', active);
  
  if (active) {
    toggleButton.classList.add('active');
    toggleButton.textContent = 'Disable Bionic Reading';
  } else {
    toggleButton.classList.remove('active');
    toggleButton.textContent = 'Enable Bionic Reading';
  }
}

// Function to update the status indicator
function updateStatus(initialized, active = false) {
  if (!statusIndicator) return;
  
  if (!initialized) {
    statusIndicator.textContent = 'Status: Not available on this page';
    statusIndicator.className = 'status-indicator not-available';
  } else if (active) {
    statusIndicator.textContent = 'Status: Active';
    statusIndicator.className = 'status-indicator active';
  } else {
    statusIndicator.textContent = 'Status: Ready';
    statusIndicator.className = 'status-indicator ready';
  }
}

// Function to check the initial state when popup is opened
function checkInitialState() {
  debugLog('Checking initial state');
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showError("Could not find active tab");
      updateStatus(false);
      return;
    }
    
    debugLog('Sending getState message to tab:', tabs[0].id);
    
    chrome.tabs.sendMessage(tabs[0].id, {action: "getState"}, function(response) {
      // Handle the case where the content script might not be loaded
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message;
        debugLog('Error checking state:', errorMessage);
        showError("Could not communicate with the page. Try reloading the page or checking if the extension has permission to run on this site.");
        updateStatus(false);
        
        // Add a reload button
        addReloadButton();
        return;
      }
      
      if (response && response.active !== undefined) {
        debugLog('Received state:', response);
        updateButtonState(response.active);
        updateStatus(true, response.active);
      } else {
        debugLog('Invalid state response:', response);
        showError("Received invalid state from content script");
        updateStatus(false);
      }
    });
  });
}

// Function to add a reload button to the popup
function addReloadButton() {
  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Reload Page';
  reloadButton.className = 'reload-button';
  reloadButton.style.marginTop = '10px';
  reloadButton.style.backgroundColor = '#27ae60';
  
  reloadButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.reload(tabs[0].id);
        window.close(); // Close the popup
      }
    });
  });
  
  const toggleSection = document.querySelector('.toggle-section');
  if (toggleSection) {
    toggleSection.appendChild(reloadButton);
  }
}

// Function to show error message
function showError(message) {
  debugLog('Showing error:', message);
  
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.display = 'block';
  
  // Hide after 8 seconds
  setTimeout(() => {
    errorMessageDiv.style.display = 'none';
  }, 8000);
}

// Function to manually test the extension
function testExtension() {
  debugLog('Testing extension');
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showError("Could not find active tab");
      return;
    }
    
    // First try to communicate directly with the content script
    chrome.tabs.sendMessage(tabs[0].id, {action: "debug"}, function(response) {
      if (chrome.runtime.lastError) {
        debugLog('Error communicating with content script:', chrome.runtime.lastError.message);
        
        // If direct communication fails, try using executeScript
        executeScriptTest(tabs[0].id);
        return;
      }
      
      if (response && response.initialized) {
        debugLog('Content script is initialized:', response);
        showError(`Test successful! Content script is initialized. Active: ${response.active}, Text nodes: ${response.textNodes}, URL: ${response.url}`);
        updateStatus(true, response.active);
      } else {
        debugLog('Content script returned invalid response:', response);
        showError('Content script returned an invalid response');
        updateStatus(false);
      }
    });
  });
}

// Function to test using executeScript as a fallback
function executeScriptTest(tabId) {
  debugLog('Trying executeScript test');
  
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    func: () => {
      // Check if the bionicReading object exists
      if (window.bionicReading) {
        console.log('Bionic Reading debug info:', window.bionicReading.debug());
        return {
          success: true,
          state: window.bionicReading.getState(),
          debug: window.bionicReading.debug()
        };
      } else {
        return {
          success: false,
          error: 'Bionic Reading not initialized',
          windowProps: Object.keys(window).filter(key => key.includes('bionic')).join(', ')
        };
      }
    }
  }).then(results => {
    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      if (result.success) {
        debugLog('executeScript test successful:', result);
        showError(`Test successful! State: ${result.state}, Debug: ${JSON.stringify(result.debug)}`);
        updateStatus(true, result.state);
      } else {
        debugLog('executeScript test failed:', result);
        showError(`Test failed: ${result.error}. Window properties: ${result.windowProps}`);
        updateStatus(false);
        
        // Inject the content script manually
        injectContentScript(tabId);
      }
    } else {
      debugLog('executeScript test execution failed');
      showError('Could not execute test script');
      updateStatus(false);
    }
  }).catch(error => {
    debugLog('executeScript test error:', error);
    showError(`Test error: ${error.message}`);
    updateStatus(false);
  });
}

// Function to manually inject the content script
function injectContentScript(tabId) {
  debugLog('Manually injecting content script');
  
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: ['content.js']
  }).then(() => {
    debugLog('Content script injected successfully');
    showError('Content script has been manually injected. Please try again.');
  }).catch(error => {
    debugLog('Error injecting content script:', error);
    showError(`Failed to inject content script: ${error.message}`);
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  debugLog('Popup loaded');
  
  // Add click event listener to toggle button
  toggleButton.addEventListener('click', toggleBionicReading);
  
  // Add test button only in debug mode
  if (DEBUG) {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Extension';
    testButton.className = 'test-button';
    testButton.style.marginTop = '10px';
    testButton.style.backgroundColor = '#f39c12';
    testButton.addEventListener('click', testExtension);
    
    const toggleSection = document.querySelector('.toggle-section');
    if (toggleSection) {
      toggleSection.appendChild(testButton);
    }
  }
  
  // Check initial state
  checkInitialState();
});

// Listen for error messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message:', message);
  
  if (message.action === "error") {
    showError(message.message);
  } else if (message.action === "contentScriptReady") {
    debugLog('Content script is ready on:', message.url);
    updateStatus(true, false);
  }
  return true;
}); 