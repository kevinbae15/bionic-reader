// Bionic Reading — popup controller
// Wires the UI to chrome.storage (settings/overrides) and to the content
// script (master toggle) per the shared contract.

'use strict';

// ----- Contract defaults (must match content.js) -----
const DEFAULT_SETTINGS = { intensity: 0.45, highlight: false, autoApply: false, remember: true };

// Intensity ratio -> label (the three allowed ratios).
const INTENSITY_LABELS = {
  0.33: 'Light',
  0.45: 'Medium',
  0.6: 'Strong',
};

// Restricted URL schemes / hosts where the content script can't run.
const RESTRICTED_SCHEMES = [
  'chrome:', 'chrome-extension:', 'about:', 'view-source:',
  'edge:', 'devtools:', 'moz-extension:',
];
const RESTRICTED_HOST_PREFIXES = [
  'chromewebstore.google.com',
];
const RESTRICTED_HOST_PATHS = [
  // chrome.google.com/webstore
  { host: 'chrome.google.com', pathPrefix: '/webstore' },
];

// Representative preview sentence (matches the mockup's tone).
const PREVIEW_TEXT = "Reading on screens shouldn't feel like work.";

// ----- DOM -----
const $ = (id) => document.getElementById(id);
const popup = $('popup');
const elMark = $('puMark');
const elBlockedMark = $('puBlockedMark');
const elSite = $('puSite');
const elHelp = $('puHelp');
const elAbout = $('puAbout');
const elBlocked = $('puBlocked');
const elLive = $('puLive');
const elSwitch = $('puSwitch');
const elState = $('puState');
const elSeg = $('puSeg');
const elIntVal = $('puIntVal');
const elHl = $('puHl');
const elAuto = $('puAuto');
const elRemember = $('puRemember');
const elExample = $('puExample');
const elFootStatus = $('puFootStatus');
const elBlockedSub = $('puBlockedSub');
const elKbdWrap = $('puKbdWrap');
const elSitesToggle = $('puSitesToggle');
const elSitesPanel = $('puSitesPanel');

// ----- Local UI state (mirrors storage; source of truth is storage/tab) -----
let settings = { ...DEFAULT_SETTINGS };
let activeTabId = null;
let host = '';            // registrable domain (default key + display)
let pageHostname = '';    // exact hostname of the current page
let isActive = false; // master toggle for this site (from content script)
let siteHasOverride = false; // does the current site have an explicit choice?

// ----- Icon mark (inline; "fixation lines" geometry, mirrors toolbar) -----
function iconMark(size, active) {
  const head = active ? '#F5A524' : '#565D72';
  const tail = '#3A4055';
  return `<svg viewBox="0 0 128 128" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="30" fill="#14161F"/>
    <rect x="26" y="36" width="34" height="12" rx="6" fill="${head}"/><rect x="64" y="36" width="38" height="12" rx="6" fill="${tail}"/>
    <rect x="26" y="58" width="28" height="12" rx="6" fill="${head}"/><rect x="58" y="58" width="44" height="12" rx="6" fill="${tail}"/>
    <rect x="26" y="80" width="40" height="12" rx="6" fill="${head}"/><rect x="70" y="80" width="20" height="12" rx="6" fill="${tail}"/>
  </svg>`;
}

function renderMark() {
  // Master toggle OFF -> muted heads, mirroring the toolbar inactive icon.
  elMark.innerHTML = iconMark(32, isActive);
}

// ----- Bionic preview renderer (self-contained) -----
// Mirrors the content engine: Unicode word runs (incl. internal ' ’ -), a
// ceil-based split clamped to [1, len]. Keeps the preview faithful to the page.
function bionic(text, ratio, highlightOn) {
  return text.replace(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu, (w) => {
    const n = Math.max(1, Math.min(w.length, Math.ceil(w.length * ratio)));
    const cls = highlightOn ? ' class="mark"' : '';
    return `<b${cls}>${w.slice(0, n)}</b>${w.slice(n)}`;
  });
}

function renderPreview() {
  // Bold prefix always shown; highlight (amber marker) toggles via the class.
  elExample.innerHTML = bionic(PREVIEW_TEXT, settings.intensity, settings.highlight);
}

// ----- URL helpers -----
function isRestrictedUrl(rawUrl) {
  if (!rawUrl) return true;
  let url;
  try {
    url = new URL(rawUrl);
  } catch (e) {
    return true;
  }
  const scheme = url.protocol; // includes trailing ':'
  if (RESTRICTED_SCHEMES.includes(scheme)) return true;
  if (scheme === 'file:') return true; // file:// — content script not available by default
  const hostname = url.hostname;
  if (RESTRICTED_HOST_PREFIXES.includes(hostname)) return true;
  for (const r of RESTRICTED_HOST_PATHS) {
    if (hostname === r.host && url.pathname.startsWith(r.pathPrefix)) return true;
  }
  return false;
}

function hostFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname || '';
  } catch (e) {
    return '';
  }
}

// ----- Messaging helpers (promisified, swallow lastError) -----
function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

function queryActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs.length ? tabs[0] : null);
    });
  });
}

// Inject the content script on demand. Pages that were already open when the
// extension was loaded/updated don't have it yet; this brings them online so
// the popup works without making the user reload. Resolves false on pages we
// aren't allowed to inject into (restricted schemes).
function injectContentScript(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
        resolve(!chrome.runtime.lastError);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

// ----- Storage helpers -----
function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ settings: DEFAULT_SETTINGS }, (data) => {
      const s = (data && data.settings) || {};
      resolve({
        intensity: typeof s.intensity === 'number' ? s.intensity : DEFAULT_SETTINGS.intensity,
        highlight: typeof s.highlight === 'boolean' ? s.highlight : DEFAULT_SETTINGS.highlight,
        autoApply: typeof s.autoApply === 'boolean' ? s.autoApply : DEFAULT_SETTINGS.autoApply,
        remember: typeof s.remember === 'boolean' ? s.remember : DEFAULT_SETTINGS.remember,
      });
    });
  });
}

function writeSettings(patch) {
  settings = { ...settings, ...patch };
  // Content scripts react via chrome.storage.onChanged — no tab message needed.
  chrome.storage.sync.set({ settings });
}

function readOverrides() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ overrides: {} }, (data) => {
      resolve((data && data.overrides) || {});
    });
  });
}

// ----- Keyboard shortcut (real value, with platform fallback) -----
function applyShortcut() {
  setShortcutUI(null); // hide the chip until we confirm a real shortcut exists
  try {
    if (chrome.commands && chrome.commands.getAll) {
      chrome.commands.getAll((commands) => {
        if (chrome.runtime.lastError || !commands) { setShortcutUI(null); return; }
        const cmd = commands.find((c) => c.name === 'toggle-bionic-reading');
        setShortcutUI(cmd && cmd.shortcut ? cmd.shortcut : null);
      });
    } else {
      setShortcutUI(null);
    }
  } catch (e) {
    setShortcutUI(null);
  }
}

// Show the shortcut chip only when one is actually assigned. Otherwise show a
// "Set shortcut" link that opens Chrome's shortcuts page — because Chrome won't
// auto-assign a suggested key if it conflicts with anything.
function setShortcutUI(shortcut) {
  if (!elKbdWrap) return;
  elKbdWrap.textContent = '';
  if (shortcut) {
    elKbdWrap.appendChild(document.createTextNode('Toggle'));
    const keys = document.createElement('span');
    keys.className = 'kbd-keys';
    shortcutKeys(shortcut).forEach((label) => {
      const cap = document.createElement('span');
      cap.className = 'kbd';
      cap.textContent = label;
      keys.appendChild(cap);
    });
    elKbdWrap.appendChild(keys);
  } else {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'foot-link';
    link.textContent = 'Set keyboard shortcut';
    link.title = 'No shortcut is assigned. Click to set one in Chrome.';
    link.addEventListener('click', openShortcutsPage);
    elKbdWrap.appendChild(link);
  }
}

function openShortcutsPage() {
  try {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  } catch (e) { /* ignore */ }
  window.close();
}

// Break a Chrome shortcut string into individual key labels, one per keycap.
function shortcutKeys(s) {
  const MOD = { '⌘': 1, '⇧': 1, '⌥': 1, '⌃': 1 };
  if (s.includes('+')) {
    return s.split('+').map((t) => keyLabel(t.trim())).filter(Boolean);
  }
  // Mac symbol form, e.g. "⌘⇧E" → ["⌘","⇧","E"].
  const out = [];
  let rest = s;
  while (rest.length && MOD[rest[0]]) { out.push(rest[0]); rest = rest.slice(1); }
  if (rest) out.push(rest);
  return out;
}

function keyLabel(t) {
  const map = {
    Command: '⌘', Cmd: '⌘', Meta: '⌘',
    Control: 'Ctrl', Ctrl: 'Ctrl', MacCtrl: '⌃',
    Shift: '⇧', Alt: '⌥', Option: '⌥',
  };
  return map[t] || t;
}

// ----- View state -----
function showRestricted(subMessage) {
  popup.dataset.ready = 'false';
  popup.dataset.on = 'false';
  elLive.hidden = true;
  elBlocked.hidden = false;
  elBlockedMark.innerHTML = iconMark(48, false);
  elSite.textContent = "Can't run here";
  if (subMessage) elBlockedSub.textContent = subMessage;
  // Header mark muted in restricted state.
  isActive = false;
  renderMark();
}

function showLive() {
  elBlocked.hidden = true;
  elLive.hidden = false;
  popup.dataset.ready = 'true';
}

// Reflect the master toggle across header subtitle, hero card, footer, mark.
function applyActiveState(active) {
  isActive = !!active;
  popup.dataset.on = isActive ? 'true' : 'false';
  elSwitch.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  // Settings are global preferences — keep them usable whether the reader is on
  // or off (intensity / highlight / auto-apply / remember are never disabled).

  elState.textContent = isActive ? 'On for this page' : 'Off — tap to enable';
  const label = host || 'this site';
  elSite.textContent = (isActive ? 'On for this site · ' : 'Off for this site · ') + label;
  elFootStatus.textContent = isActive ? 'Active on this page' : 'Ready';
  renderMark();
}

// Reflect settings into the segmented control + row switches + preview.
function applySettings() {
  // Intensity segmented control.
  let matched = false;
  [...elSeg.children].forEach((btn) => {
    const r = parseFloat(btn.dataset.r);
    const on = Math.abs(r - settings.intensity) < 1e-9;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) matched = true;
  });
  const label = INTENSITY_LABELS[settings.intensity] ||
    (matched ? elIntVal.textContent : 'Medium');
  elIntVal.textContent = label;

  // Row switches.
  elHl.setAttribute('aria-pressed', settings.highlight ? 'true' : 'false');
  elAuto.setAttribute('aria-pressed', settings.autoApply ? 'true' : 'false');
  if (elRemember) elRemember.setAttribute('aria-pressed', settings.remember ? 'true' : 'false');

  renderPreview();
}

// ----- Event wiring -----
function wireEvents() {
  // Help "?" toggles the About blurb.
  elHelp.addEventListener('click', () => {
    const open = elHelp.getAttribute('aria-expanded') === 'true';
    elHelp.setAttribute('aria-expanded', open ? 'false' : 'true');
    elAbout.hidden = open;
  });

  // Master toggle -> message the tab; reflect the returned active state.
  elSwitch.addEventListener('click', async () => {
    if (activeTabId == null) return;
    const desired = elSwitch.getAttribute('aria-pressed') !== 'true';
    // Optimistic: show the intended state immediately.
    applyActiveState(desired);
    const resp = await sendToTab(activeTabId, { type: 'BR_SET_ACTIVE', active: desired });
    if (resp && typeof resp.active === 'boolean') {
      applyActiveState(resp.active);
      setTimeout(renderSites, 150); // the override store changed
    } else {
      // Content script went away — fall back to restricted view.
      showRestricted("This page won't let extensions run — try reloading it.");
    }
  });

  // Enabled-sites disclosure.
  elSitesToggle.addEventListener('click', () => {
    const willOpen = elSitesToggle.getAttribute('aria-expanded') !== 'true';
    elSitesToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    elSitesPanel.hidden = !willOpen;
    if (willOpen) renderSites();
  });

  // Intensity segmented control -> write settings.intensity to storage.sync.
  elSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const ratio = parseFloat(btn.dataset.r);
    writeSettings({ intensity: ratio });
    applySettings();
  });

  // Highlight toggle -> write settings.highlight to storage.sync.
  elHl.addEventListener('click', () => {
    const next = elHl.getAttribute('aria-pressed') !== 'true';
    writeSettings({ highlight: next });
    applySettings();
  });

  // Auto-apply toggle -> write settings.autoApply to storage.sync, then re-sync
  // the master toggle to whatever the page actually does (the content script
  // keeps an on page on when auto-apply turns off).
  elAuto.addEventListener('click', async () => {
    const next = elAuto.getAttribute('aria-pressed') !== 'true';
    writeSettings({ autoApply: next });
    applySettings();
    await syncActiveFromTab();
    renderSites();
  });

  // Remember toggle -> write settings.remember to storage.sync.
  if (elRemember) {
    elRemember.addEventListener('click', () => {
      const next = elRemember.getAttribute('aria-pressed') !== 'true';
      writeSettings({ remember: next });
      applySettings();
    });
  }
}

// Re-read the authoritative state from the content script (the source of truth
// for the current tab) after a settings change that may flip the page.
async function syncActiveFromTab() {
  if (activeTabId == null) return;
  await new Promise((r) => setTimeout(r, 130)); // let the content script react
  const state = await sendToTab(activeTabId, { type: 'BR_GET_STATE' });
  if (state && typeof state.active === 'boolean') {
    siteHasOverride = !!state.hasOverride;
    if (typeof state.host === 'string') host = state.host;
    applyActiveState(state.active);
  }
}

// ----- Enabled-sites list -----
function siteNote(text) {
  const d = document.createElement('div');
  d.className = 'site-note';
  d.textContent = text;
  return d;
}
function siteHead(text) {
  const d = document.createElement('div');
  d.className = 'site-head';
  d.textContent = text;
  return d;
}
function siteRow(domain) {
  const row = document.createElement('div');
  row.className = 'site-row';
  const name = document.createElement('span');
  name.className = 'site-name';
  name.textContent = domain;
  if (domain === host) name.textContent += ' (this site)';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'site-remove';
  btn.textContent = '×';
  btn.title = 'Forget this site';
  btn.setAttribute('aria-label', 'Forget ' + domain);
  btn.addEventListener('click', () => forgetSite(domain));
  row.appendChild(name);
  row.appendChild(btn);
  return row;
}
function siteListEl() {
  const d = document.createElement('div');
  d.className = 'site-list';
  return d;
}

// Normalize free-text input into a bare domain: strip scheme, path, port, etc.
function normalizeDomain(input) {
  let s = (input || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');     // scheme
  s = s.split('/')[0].split('?')[0].split('#')[0];  // path/query/fragment
  s = s.split('@').pop();                            // userinfo
  s = s.split(':')[0];                              // port
  if (!s) return '';
  // Never let prototype-polluting segments become storage keys.
  const BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);
  if (s.split('.').some((p) => BLOCKED.has(p))) return '';
  if (s === 'localhost' || /^[0-9.]+$/.test(s)) return s;
  if (!s.includes('.')) return ''; // reject obvious junk like "nytimes"
  return s;
}

async function addDomain(raw) {
  const d = normalizeDomain(raw);
  if (!d) return;
  const overrides = await readOverrides();
  overrides[d] = true;
  await new Promise((res) => chrome.storage.local.set({ overrides }, res));
  await syncActiveFromTab(); // page may turn on if it matches the added domain
  renderSites();
}

async function forgetSite(domain) {
  const overrides = await readOverrides();
  delete overrides[domain];
  await new Promise((res) => chrome.storage.local.set({ overrides }, res));
  await syncActiveFromTab(); // reflect any change in the master toggle
  renderSites();
}

function buildAddArea(enabled) {
  const wrap = document.createElement('div');
  wrap.className = 'site-add-area';

  // Quick "add this site" (uses the registrable domain — covers subdomains).
  if (host && !enabled.includes(host)) {
    const addThis = document.createElement('button');
    addThis.type = 'button';
    addThis.className = 'site-add-current';
    addThis.textContent = '+ Add this site (' + host + ')';
    addThis.addEventListener('click', () => addDomain(host));
    wrap.appendChild(addThis);
  }

  // Custom domain / subdomain input.
  const row = document.createElement('div');
  row.className = 'site-add';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'site-add-input';
  input.placeholder = pageHostname || 'example.com or sub.example.com';
  input.setAttribute('aria-label', 'Add a domain or subdomain');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'site-add-btn';
  btn.textContent = 'Add';
  const submit = () => { if (input.value.trim()) addDomain(input.value); };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  row.appendChild(input);
  row.appendChild(btn);
  wrap.appendChild(row);
  return wrap;
}

async function renderSites() {
  if (!elSitesPanel) return;
  const overrides = await readOverrides();
  siteHasOverride = host ? Object.prototype.hasOwnProperty.call(overrides, host) : false;
  const enabled = Object.keys(overrides).filter((d) => overrides[d] === true).sort();
  const disabled = Object.keys(overrides).filter((d) => overrides[d] === false).sort();

  elSitesPanel.textContent = '';

  // Auto-apply on: every site is on by default, so there's nothing to add —
  // just show any sites the user has explicitly turned off.
  if (settings.autoApply) {
    elSitesPanel.appendChild(siteNote('Bionic Reading is on by default on every site.'));
    if (disabled.length) {
      elSitesPanel.appendChild(siteHead('Turned off on'));
      const list = siteListEl();
      disabled.forEach((d) => list.appendChild(siteRow(d)));
      elSitesPanel.appendChild(list);
    }
    return;
  }

  // Auto-apply off: offer add controls + the list of enabled sites.
  elSitesPanel.appendChild(buildAddArea(enabled));
  const list = siteListEl();
  if (enabled.length) {
    enabled.forEach((d) => list.appendChild(siteRow(d)));
  } else {
    list.appendChild(siteNote('No sites enabled yet. Add one above, or use the switch.'));
  }
  elSitesPanel.appendChild(list);
}

// ----- Init -----
async function init() {
  wireEvents();
  applyShortcut();
  renderMark();

  // Load global settings up front so controls/preview are correct regardless.
  settings = await readSettings();
  applySettings();

  const tab = await queryActiveTab();
  if (!tab || tab.id == null) {
    showRestricted('Open a website and try again.');
    return;
  }
  activeTabId = tab.id;
  if (tab.url) {
    pageHostname = hostFromUrl(tab.url);
    host = pageHostname;
  }

  // Only hard-block on schemes we genuinely can't run on (browser pages, the
  // Web Store, etc.). Everything else we attempt — including pages where the
  // URL isn't readable.
  if (tab.url && isRestrictedUrl(tab.url)) {
    showRestricted('Browser pages like settings and the Web Store are off-limits.');
    return;
  }

  // Confirm the content script is alive. If it isn't (a tab that was open
  // before the extension loaded), inject it on demand and ping again.
  let pong = await sendToTab(activeTabId, { type: 'BR_PING' });
  if (!pong || pong.ok !== true) {
    const injected = await injectContentScript(activeTabId);
    if (injected) pong = await sendToTab(activeTabId, { type: 'BR_PING' });
  }
  if (!pong || pong.ok !== true) {
    showRestricted("This page won't let extensions run — try reloading it.");
    return;
  }

  // Content script is alive — get authoritative state.
  showLive();
  const state = await sendToTab(activeTabId, { type: 'BR_GET_STATE' });
  if (state && typeof state.active === 'boolean') {
    if (state.settings) {
      settings = {
        intensity: typeof state.settings.intensity === 'number' ? state.settings.intensity : settings.intensity,
        highlight: typeof state.settings.highlight === 'boolean' ? state.settings.highlight : settings.highlight,
        autoApply: typeof state.settings.autoApply === 'boolean' ? state.settings.autoApply : settings.autoApply,
        remember: typeof state.settings.remember === 'boolean' ? state.settings.remember : settings.remember,
      };
      applySettings();
    }
    if (state.host) {
      host = state.host;
    }
    siteHasOverride = !!state.hasOverride;
    applyActiveState(state.active);
  } else {
    // Alive but no state — default to off, still interactive.
    applyActiveState(false);
  }
  renderSites();
}

document.addEventListener('DOMContentLoaded', init);
