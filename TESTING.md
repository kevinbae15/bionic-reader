# Bionic Reading — Manual Test Checklist

A practical pass to run before shipping. Load the extension unpacked (see `INSTALLATION.md`) and work through the cases below.

## Suggested test pages

- **Article / prose**: a news article (BBC, NYT) or a Wikipedia entry.
- **Inline markup + code**: an MDN page or a GitHub README (mix of links, inline `code`, and code blocks).
- **Infinite scroll**: Reddit, an X/Twitter feed, or any endless-scroll listing.
- **Restricted page**: `chrome://extensions/`, the Chrome Web Store, or a `view-source:` URL.

## Core controls

- [ ] **Toggle on/off** — open the popup on an article, flip the master toggle on; prose gets bold heads. Flip it off; the page returns to normal.
- [ ] **Per-site memory persists** — turn it on for a site, reload the page (and revisit later); it comes back on automatically. Turn it off, reload; it stays off.
- [ ] **Intensity changes live** — with the effect on, switch Light → Medium → Strong; the amount of each word bolded changes immediately, no reload needed.
- [ ] **Highlight prefix on/off** — toggle the highlight off; the amber background disappears but the bold prefix remains. Toggle it back on; the amber highlight returns. The bold is never removed by this control.
- [ ] **Auto-apply on a fresh site** — enable "Auto-apply on every site", then visit a site you have never toggled; the effect turns on automatically. A per-site off choice still overrides auto-apply on that site.
- [ ] **Keyboard shortcut** — press `Ctrl+Shift+E` / `Command+Shift+E` on a normal page; it toggles the current site the same as the master toggle, and the toolbar icon switches between active (amber) and inactive (muted).

## Engine correctness

- [ ] **Dynamic content** — on an infinite-scroll page, enable the effect, then scroll to load more; newly loaded text is processed automatically.
- [ ] **Whitespace & markup preserved** — on a page with inline links and code, enable the effect; spacing is unchanged, links remain clickable and styled, and inline/block code is left untouched (not bolded).
- [ ] **Smart scope** — navigation, headers, footers, sidebars, form fields, buttons, and media captions are not transformed; only readable body text is.
- [ ] **Faithful restore** — toggle off (or reload with it off); the page text matches the original exactly, with no leftover wrappers, stray spans, or altered spacing.

## Restricted pages

- [ ] **Calm "can't run here" state** — open the popup on a restricted page (`chrome://`, Chrome Web Store, `view-source:`); the popup shows a calm "Bionic Reading can't run on this page" message rather than an error or a dead toggle.

## Quick regression sweep

- [ ] Switch tabs and windows; the toolbar icon reflects each tab's active/inactive state correctly.
- [ ] Re-toggle a few times on the same page; no duplicated bolding, no drift, restore is still clean.
