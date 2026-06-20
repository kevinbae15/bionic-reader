# Bionic Reading

Read faster on any website. Bionic Reading bolds the leading part of each word to create "fixation points" that guide your eyes and let your brain fill in the rest.

![image](https://github.com/user-attachments/assets/5cd75d66-f8bb-4b0b-8df3-e6ae5cfbfef2)
![image](https://github.com/user-attachments/assets/f0b4dbce-d283-4e78-af2d-e87340cfc082)

## What is Bionic Reading?

Bionic Reading is a reading technique that bolds the first few letters of each word. Those bolded heads act as anchors — your eyes lock onto them and your brain completes the word automatically, so you move through text with less effort and better focus.

## Features

- **Master toggle** — turn the effect on or off for the current site with one click.
- **Per-site memory** — your on/off choice is remembered per hostname, so each site stays the way you left it.
- **Intensity** — choose Light, Medium, or Strong to control how much of each word is bolded. Medium is the default.
- **Highlight prefix** — optionally add a subtle amber highlight behind each bold head. The bold prefix is always on; the highlight is the only optional part.
- **Auto-apply on every site** — flip this on to have Bionic Reading activate automatically on every page you visit (per-site choices still win).
- **Works across sites** — runs on any page via a single content script.
- **Dynamic-content support** — newly loaded text (infinite scroll, single-page apps, AJAX) is processed as it appears.
- **Faithful to the page** — preserves whitespace, links, and markup, and restores the page exactly when you turn it off.
- **Private by design** — 100% local. No data collection, no network requests, nothing leaves your browser.

## Install

### From the Chrome Web Store (recommended)

1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/bionic-reading/olmgnacpmdpjdjgemimpmoepbacfheaf).
2. Click **Add to Chrome**.
3. Confirm with **Add extension**.

### Load unpacked (development)

1. Clone or download this repository.
2. Open `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the repository's root folder (the one containing `manifest.json`).

## Usage

Click the extension icon to open the popup, then:

- Use the **master toggle** to switch Bionic Reading on or off for the current site.
- Pick an **Intensity** (Light / Medium / Strong).
- Turn the **Highlight prefix** on or off.
- Enable **Auto-apply on every site** if you want it active everywhere by default.

You can also toggle the current site from the keyboard with `Ctrl+Shift+E` (Windows/Linux) or `Command+Shift+E` (Mac).

## How it works

- **Smart scope** — only readable prose is transformed. Navigation, headers, footers, asides, forms, buttons, inputs, code, media, and editable regions are skipped.
- **DOM-safe transform** — each word's prefix is wrapped in real DOM nodes (never via `innerHTML`), so whitespace, inline links, and existing markup stay intact and the page restores faithfully.
- **Live settings** — intensity and highlight are stored in `chrome.storage`; changes apply immediately to active pages without a reload.
- **Dynamic content** — a `MutationObserver` watches the page and processes text that loads after the initial render.

## Known limitations

Bionic Reading rewrites page text in place, which a few situations don't love:

- **Heavy single-page apps.** Some apps (built on frameworks that re-render aggressively) may re-draw a region and briefly undo the effect, or flicker. Toggling off and on re-applies it. The extension is built to fail safe — it won't crash the page.
- **Web components / shadow DOM.** Text inside open shadow roots is processed on load; content that a component renders into its shadow root *after* load may not be picked up.
- **Iframes and preformatted text.** Embedded frames aren't processed, and code blocks / CSS-preformatted regions are skipped on purpose so alignment stays intact.

Turning the effect off restores the original text. If a page ever looks off, toggle off (or reload).

## Privacy

This extension runs entirely in your browser. It does not collect any data, does not make any network requests, and never sends your reading or browsing anywhere.

## License

MIT — see the [LICENSE](LICENSE) file.

## Acknowledgments

Inspired by the Bionic Reading® method developed by Renato Casutt.
