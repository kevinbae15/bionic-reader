
A Chrome extension that automatically applies the Bionic Reading technique to any website, enhancing readability and comprehension by bolding the first few letters of each word.

## What is Bionic Reading?

Bionic Reading is a reading technique that guides the eyes through text by bolding the first few letters of each word. This creates "fixation points" that help the brain complete the word, allowing for faster reading and better comprehension.

![image](https://github.com/user-attachments/assets/5cd75d66-f8bb-4b0b-8df3-e6ae5cfbfef2)
![image](https://github.com/user-attachments/assets/f0b4dbce-d283-4e78-af2d-e87340cfc082)


## Features

- **One-Click Toggle**: Enable or disable Bionic Reading with a single click.
- **Keyboard Shortcut**: Toggle with `Ctrl+Shift+E` (Windows/Linux) or `Command+Shift+E` (Mac).
- **Automatic Content Detection**: Automatically identifies and processes main content areas on websites.
- **Dynamic Content Support**: Works with infinite scrolling and dynamically loaded content.
- **Preservation of Page Structure**: Maintains the original HTML structure and styling of the page.
- **Visual Feedback**: Clear visual indication when Bionic Reading is active.

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/bionic-reading/olmgnacpmdpjdjgemimpmoepbacfheaf)
2. Click "Add to Chrome".
3. Confirm by clicking "Add Extension".

### Manual Installation (Development)

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the extension directory.

## Usage

1. Click the extension icon in your browser toolbar to open the popup.
2. Click the "Toggle Bionic Reading" button to enable or disable the effect.
3. Alternatively, use the keyboard shortcut `Ctrl+Shift+E` (Windows/Linux) or `Command+Shift+E` (Mac).

## How It Works

The extension:
1. Identifies the main content areas of a webpage.
2. Processes text nodes to bold the first few letters of each word.
3. Uses a MutationObserver to automatically apply the effect to dynamically loaded content.
4. Preserves the original content to restore it when the effect is disabled.

## Limitations

- May not work perfectly on all websites, especially those with complex or unusual structures.
- Does not modify text in images, videos, or other non-HTML content.
- Performance may vary on very large pages or with certain complex websites.

## Privacy

This extension:
- Does not collect any user data.
- Does not send any information to external servers.
- Operates entirely within your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the Bionic Reading® method developed by Renato Casutt. 
