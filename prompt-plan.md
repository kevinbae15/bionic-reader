## Step-by-Step Blueprint for Building the Bionic Reading Chrome Extension

### Phase 1: Initial Setup and Configuration

**Step 1.1: Set up the Chrome Extension Project Structure**
- Create the following folder structure:
  - `manifest.json`
  - `background.js`
  - `content.js`
  - `popup.html`
  - `popup.js`
  - `styles.css`
  - `icons/`

**Step 1.2: Create Manifest File (`manifest.json`)**
- Configure the Chrome extension with the necessary permissions.
- Define the background script, content script, popup, and icons.

```json
{
  "manifest_version": 3,
  "name": "Bionic Reading",
  "description": "Automatically apply Bionic Reading to any website.",
  "version": "1.0",
  "permissions": [
    "activeTab"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "commands": {
    "toggle-bionic-reading": {
      "suggested_key": {
        "default": "Ctrl+Alt+B",
        "mac": "Command+Alt+B"
      },
      "description": "Toggle Bionic Reading"
    }
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/inactive-icon.png",
      "48": "icons/inactive-icon.png"
    }
  }
}
```

---

### Phase 2: Keyboard Shortcut and Toggle Logic

**Step 2.1: Implement Keyboard Shortcut Handling**
- Implement the logic for the `Ctrl + Alt + B` (Windows/Linux) or `Cmd + Alt + B` (Mac) keyboard shortcut using the Chrome `commands` API.
- This will trigger a toggle to enable or disable the Bionic Reading effect.

```js
chrome.commands.onCommand.addListener(function(command) {
  if (command === "toggle-bionic-reading") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: toggleBionicReading
      });
    });
  }
});

function toggleBionicReading() {
  document.body.classList.toggle('bionic-reading-active');
}
```

**Step 2.2: Create the `toggleBionicReading` Function**
- This function will toggle the state of Bionic Reading by adding/removing a class (`.bionic-reading-active`) to the body element.

---

### Phase 3: Content Detection and Bionic Reading Effect

**Step 3.1: Set Up Content Detection Logic**
- Use `document.querySelectorAll()` to select the main content areas on the page (`<article>`, `<main>`, `<section>`, etc.).
- Implement a regular expression to identify individual words and apply the bolding effect to the first few characters.

```js
function applyBionicReading() {
  const mainContentAreas = document.querySelectorAll('article, main, section, p');
  mainContentAreas.forEach(area => {
    area.innerHTML = area.innerText.split(' ').map(word => {
      const bolded = word.slice(0, 3); // Bold first 3 letters
      const rest = word.slice(3);
      return `<span><b>${bolded}</b>${rest}</span>`;
    }).join(' ');
  });
}
```

**Step 3.2: Integrate the Bionic Reading Logic with Toggle**
- Modify the `toggleBionicReading` function to call `applyBionicReading` when the class is added to the body.

```js
function toggleBionicReading() {
  document.body.classList.toggle('bionic-reading-active');
  if (document.body.classList.contains('bionic-reading-active')) {
    applyBionicReading();
  }
}
```

---

### Phase 4: Dynamic Content Handling

**Step 4.1: Use MutationObserver to Detect Dynamic Content**
- Implement a MutationObserver to handle dynamically loaded content (infinite scroll or AJAX updates).

```js
const observer = new MutationObserver(() => {
  if (document.body.classList.contains('bionic-reading-active')) {
    applyBionicReading();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

---

### Phase 5: Error Handling and Notifications

**Step 5.1: Error Handling in `applyBionicReading`**
- Add try-catch blocks to handle potential issues (e.g., unsupported page structures, failed bolding).
- Display errors in the popup UI if the effect fails.

```js
function applyBionicReading() {
  try {
    const mainContentAreas = document.querySelectorAll('article, main, section, p');
    mainContentAreas.forEach(area => {
      area.innerHTML = area.innerText.split(' ').map(word => {
        const bolded = word.slice(0, 3);
        const rest = word.slice(3);
        return `<span><b>${bolded}</b>${rest}</span>`;
      }).join(' ');
    });
  } catch (error) {
    chrome.runtime.sendMessage({error: "Unable to apply Bionic Reading"});
  }
}
```

**Step 5.2: Display Errors in Popup**
- Implement message handling in the popup UI to show error notifications.

---

### Phase 6: Popup UI and Icon Update

**Step 6.1: Update the Popup UI**
- Create a simple popup UI (`popup.html`) with a message area and an option to toggle the Bionic Reading effect manually.

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1>Bionic Reading</h1>
    <button id="toggle">Toggle Bionic Reading</button>
    <p id="error-message"></p>
    <script src="popup.js"></script>
  </body>
</html>
```

**Step 6.2: Handle Popup Interactions**
- Implement popup logic to toggle the Bionic Reading effect from the popup button.

```js
document.getElementById('toggle').addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: toggleBionicReading
    });
  });
});
```

**Step 6.3: Update the Icon Based on Active/Inactive State**
- Implement logic to change the extension icon when Bionic Reading is toggled.

```js
chrome.action.onClicked.addListener((tab) => {
  chrome.action.setIcon({
    path: document.body.classList.contains('bionic-reading-active') ? 'icons/active-icon.png' : 'icons/inactive-icon.png'
  });
});
```

---

### Phase 7: Testing and Debugging

**Step 7.1: Functional Testing**
- Ensure the keyboard shortcut works.
- Test the Bionic Reading effect on various websites.
- Verify the toggling behavior works properly.

**Step 7.2: Error Handling Testing**
- Test that error messages appear in the popup UI when the extension fails to apply the bolding effect.

**Step 7.3: Performance Testing**
- Ensure the extension does not cause significant performance degradation on websites, especially those with dynamic content.

---

### Phase 8: Packaging and Deployment

**Step 8.1: Package the Extension**
- Package the extension and upload it to the Chrome Web Store for distribution.

**Step 8.2: Installation Instructions**
- Provide clear instructions for installation from the Chrome Web Store or for manual installation via the `.crx` file.

---

## Iterative Chunks Breakdown

1. **Project Setup:**  
   - Create the necessary folder structure and `manifest.json` file.

2. **Keyboard Shortcut and Toggle Logic:**  
   - Implement the `Ctrl + Alt + B` / `Cmd + Alt + B` keyboard shortcut and `toggleBionicReading` function.

3. **Content Detection and Bionic Reading Effect:**  
   - Write the logic to find main content areas and apply bolding to the first few letters of every word.

4. **Dynamic Content Handling:**  
   - Use `MutationObserver` to detect and process new content.

5. **Error Handling and Notifications:**  
   - Add try-catch blocks and message handling to report errors in the popup.

6. **Popup UI and Icon Update:**  
   - Create the popup and implement logic to change the icon and display error messages.

7. **Testing and Debugging:**  
   - Perform testing to ensure functionality, error handling, and performance.

8. **Packaging and Deployment:**  
   - Package the extension and prepare for distribution.

---