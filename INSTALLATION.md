# Bionic Reading — Installation Guide

## Install from the Chrome Web Store (recommended)

1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/bionic-reading/olmgnacpmdpjdjgemimpmoepbacfheaf).
2. Click **Add to Chrome**.
3. In the confirmation dialog, click **Add extension**.
4. The Bionic Reading icon appears in your toolbar.

## Load unpacked (development / testing)

Works in Chrome and any Chromium-based browser (Edge, Brave, Opera, etc.).

1. Clone or download this repository. If you downloaded a ZIP, extract it so every file sits in a single folder.
2. Open the browser's extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the **repository root folder** — the directory that contains `manifest.json` at its top level. Do not select a subfolder.
6. The extension appears in your list and its icon shows in the toolbar.

To pick up code changes, return to the extensions page and click the refresh icon on the Bionic Reading card.

## Keyboard shortcut

Toggle the current site with `Ctrl+Shift+E` (Windows/Linux) or `Command+Shift+E` (Mac). If it conflicts with another shortcut, reassign it at `chrome://extensions/shortcuts`.

## Uninstall

Right-click the toolbar icon and choose **Remove from Chrome**, or remove it from the extensions page.
