# Bionic Reading Extension - Testing Guide

This document provides a structured approach to testing the Bionic Reading Chrome Extension before deployment.

## Prerequisites

- Chrome browser (latest version recommended)
- Extension files loaded as an unpacked extension

## Loading the Extension for Testing

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the extension directory
4. Verify the extension icon appears in your browser toolbar

## Functional Testing

### Basic Functionality

- [ ] **Icon Display Test**
  - Verify the extension icon appears in the toolbar
  - Verify the icon is the inactive version (blue with lowercase 'b')

- [ ] **Popup Display Test**
  - Click the extension icon
  - Verify the popup opens
  - Verify the toggle button displays "Enable Bionic Reading"
  - Verify the example section shows both normal and bionic text

- [ ] **Keyboard Shortcut Test**
  - Navigate to any content-rich website (e.g., a news article)
  - Press `Ctrl+Shift+E` (Windows/Linux) or `Command+Shift+E` (Mac)
  - Verify the Bionic Reading effect is applied to the page
  - Verify the extension icon changes to the active version (red with uppercase 'B')
  - Press the shortcut again
  - Verify the Bionic Reading effect is removed
  - Verify the extension icon changes back to the inactive version

- [ ] **Toggle Button Test**
  - Click the extension icon to open the popup
  - Click the "Enable Bionic Reading" button
  - Verify the Bionic Reading effect is applied to the page
  - Verify the button text changes to "Disable Bionic Reading"
  - Verify the button style changes (blue to red)
  - Click the button again
  - Verify the Bionic Reading effect is removed
  - Verify the button text changes back to "Enable Bionic Reading"

### Content Detection

- [ ] **Article Content Test**
  - Navigate to a news article (e.g., CNN, BBC, Medium)
  - Enable Bionic Reading
  - Verify the effect is applied to the main article content
  - Verify the effect is NOT applied to navigation, buttons, or other UI elements

- [ ] **Blog Content Test**
  - Navigate to a blog post
  - Enable Bionic Reading
  - Verify the effect is applied to the blog content
  - Verify paragraphs, headings, and lists are properly processed

- [ ] **Documentation Content Test**
  - Navigate to documentation pages (e.g., MDN, GitHub README)
  - Enable Bionic Reading
  - Verify the effect is applied to the documentation content
  - Verify code blocks and technical content are properly handled

### Dynamic Content

- [ ] **Infinite Scroll Test**
  - Navigate to a site with infinite scrolling (e.g., Twitter, Reddit)
  - Enable Bionic Reading
  - Scroll down to load more content
  - Verify the effect is automatically applied to newly loaded content

- [ ] **AJAX Content Test**
  - Navigate to a site that loads content dynamically (e.g., a single-page application)
  - Enable Bionic Reading
  - Interact with the page to load new content
  - Verify the effect is applied to the newly loaded content

### Error Handling

- [ ] **No Content Error Test**
  - Navigate to a page with minimal text content (e.g., a login page)
  - Enable Bionic Reading
  - Verify an appropriate error message is displayed in the popup

- [ ] **Complex Page Error Test**
  - Navigate to a complex page with unusual structure
  - Enable Bionic Reading
  - If the extension fails to apply the effect, verify an error message is displayed

## Performance Testing

- [ ] **Page Load Test**
  - Navigate to a content-heavy page
  - Enable Bionic Reading
  - Verify the page remains responsive
  - Verify there is no significant delay in applying the effect

- [ ] **Scrolling Performance Test**
  - Navigate to a long article or infinite scrolling page
  - Enable Bionic Reading
  - Scroll up and down rapidly
  - Verify scrolling remains smooth

## Cross-Browser Testing

- [ ] **Chrome Test**
  - Perform basic functionality tests in Chrome
  - Verify all features work as expected

- [ ] **Edge Test**
  - Load the extension in Microsoft Edge
  - Perform basic functionality tests
  - Verify all features work as expected

- [ ] **Other Chromium Browsers Test** (Optional)
  - Load the extension in other Chromium-based browsers (e.g., Brave, Opera)
  - Verify basic functionality

## Reporting Issues

When reporting issues, please include:

1. The specific test that failed
2. The browser and version used
3. The website where the issue occurred
4. A description of the expected vs. actual behavior
5. Screenshots if applicable

## Final Checklist

Before packaging for distribution:

- [ ] All functional tests pass
- [ ] Performance is acceptable on various websites
- [ ] Error handling works correctly
- [ ] Icons display correctly in all states
- [ ] Popup UI is functional and visually correct
- [ ] Keyboard shortcut works consistently 