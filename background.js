// Bionic Reading — MV3 service worker.
//
// This worker is event-driven and may be torn down at any time, so it keeps no
// long-lived state. chrome.storage is the source of truth for on/off state;
// each tab's content script applies it and reports changes, and this worker
// only mirrors the per-tab state onto the toolbar icon, recomputing from
// messages/queries each time it wakes.

const DEBUG = false;
function log(...args) {
  if (DEBUG) console.log('[Bionic Reading SW]', ...args);
}

const ICONS = {
  active: {
    16: 'icons/active-icon-16.png',
    32: 'icons/active-icon-32.png',
    48: 'icons/active-icon-48.png',
    128: 'icons/active-icon-128.png'
  },
  inactive: {
    16: 'icons/inactive-icon-16.png',
    32: 'icons/inactive-icon-32.png',
    48: 'icons/inactive-icon-48.png',
    128: 'icons/inactive-icon-128.png'
  }
};

// Set the toolbar icon for a single tab. The tab may have closed between the
// triggering event and this call, so swallow any failure.
function setIconForTab(tabId, active) {
  if (typeof tabId !== 'number') return;
  try {
    chrome.action.setIcon({
      tabId,
      path: active ? ICONS.active : ICONS.inactive
    });
  } catch (e) {
    log('setIconForTab failed', tabId, e);
  }
}

// Best-effort: ask a tab for its current state and mirror it to the icon.
// Never injects — a missing content script just means the icon stays inactive.
function refreshIconFromTab(tabId) {
  if (typeof tabId !== 'number') return;
  chrome.tabs.sendMessage(tabId, { type: 'BR_GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      // No content script alive on this tab; leave the default (inactive) icon.
      log('BR_GET_STATE no reply', tabId, chrome.runtime.lastError.message);
      return;
    }
    if (response && typeof response.active === 'boolean') {
      setIconForTab(tabId, response.active);
    }
  });
}

// --- Keyboard command: toggle Bionic Reading on the active tab -------------

function injectThenToggle(tabId) {
  // The only place we inject — a guarded fallback for pages that predate the
  // extension. executeScript can both reject (restricted tab) and, for some
  // invalid targets, throw synchronously, so guard both.
  try {
    chrome.scripting
      .executeScript({ target: { tabId }, files: ['content.js'] })
      .then(() => {
        chrome.tabs.sendMessage(tabId, { type: 'BR_TOGGLE' }, (retry) => {
          if (chrome.runtime.lastError) {
            log('toggle: retry failed', chrome.runtime.lastError.message);
            return;
          }
          if (retry && typeof retry.active === 'boolean') setIconForTab(tabId, retry.active);
        });
      })
      .catch((err) => log('toggle: injection failed (restricted tab)', err));
  } catch (err) {
    log('toggle: executeScript threw', err);
  }
}

function handleToggleCommand(command) {
  if (command !== 'toggle-bionic-reading') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) return;
    const tab = tabs && tabs[0];
    if (!tab || typeof tab.id !== 'number') {
      log('toggle: no active tab');
      return;
    }
    const tabId = tab.id;
    chrome.tabs.sendMessage(tabId, { type: 'BR_TOGGLE' }, (response) => {
      if (chrome.runtime.lastError) {
        log('toggle: no content script, injecting', chrome.runtime.lastError.message);
        injectThenToggle(tabId);
        return;
      }
      if (response && typeof response.active === 'boolean') setIconForTab(tabId, response.active);
    });
  });
}

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    try {
      handleToggleCommand(command);
    } catch (err) {
      log('command handler error', err);
    }
  });
}

// --- Messages from content scripts -----------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only trust messages from our own content scripts.
  if (!sender || sender.id !== chrome.runtime.id) return false;
  if (message && message.type === 'BR_STATE_CHANGED') {
    const tabId = sender && sender.tab && sender.tab.id;
    setIconForTab(tabId, !!message.active);
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

// --- Keep the icon in sync as the user moves around -------------------------

chrome.tabs.onActivated.addListener(({ tabId }) => {
  refreshIconFromTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  // No URL gate — that would need the `tabs` permission to read tab.url.
  // refreshIconFromTab just no-ops on tabs without a content script, and we
  // never auto-inject here (that was the double-injection bug).
  refreshIconFromTab(tabId);
});

log('service worker loaded');
