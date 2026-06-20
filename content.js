// Bionic Reading — content script (Manifest V3)
// Faithful, innerHTML-free engine: per-text-node wrappers, whitespace-preserving,
// shadow-DOM aware, chunked apply, denylist-scoped TreeWalker.

(function () {
  'use strict';

  // --- Double-init guard ---------------------------------------------------
  // A second (programmatic) injection must not re-register listeners/observers.
  if (window.__bionicReadingLoaded) return;
  window.__bionicReadingLoaded = true;

  // --- Tiny guarded logger (no production spam) ----------------------------
  const DEBUG = false;
  const log = (...args) => { if (DEBUG) console.log('[BionicReading]', ...args); };

  // --- Defaults (must match popup.js) --------------------------------------
  const DEFAULT_SETTINGS = { intensity: 0.45, highlight: false, autoApply: false, remember: true };

  // Reduce a hostname to its registrable domain so per-site memory covers
  // subdomains (www., m., etc.) of the same site. Uses a small heuristic for
  // common two-part public suffixes; falls back to the last two labels.
  function registrableDomain(hostname) {
    if (!hostname) return hostname;
    if (hostname === 'localhost' || hostname.includes(':') || /^[0-9.]+$/.test(hostname)) {
      return hostname; // localhost / IPv6 / IPv4 literal — use verbatim
    }
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);
    const last = parts[parts.length - 1];
    const penult = parts[parts.length - 2];
    if (last.length === 2 && SECOND_LEVEL.has(penult)) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }

  // --- Module state --------------------------------------------------------
  let active = false;
  let settings = { ...DEFAULT_SETTINGS };
  let highlight = DEFAULT_SETTINGS.highlight;
  const fullHost = location.hostname;        // exact hostname of this page
  const host = registrableDomain(fullHost);  // registrable domain (display + default key)

  // An override key applies to this page if it equals the full hostname or this
  // page is a subdomain of it. The longest matching key wins (most specific),
  // so "www.example.com" beats a broader "example.com" entry.
  function matchingOverrideKey(overrides) {
    let best = null;
    for (const k in overrides) {
      if (!Object.prototype.hasOwnProperty.call(overrides, k)) continue;
      if (fullHost === k || fullHost.endsWith('.' + k)) {
        if (best === null || k.length > best.length) best = k;
      }
    }
    return best;
  }
  function effectiveActive(overrides) {
    const k = matchingOverrideKey(overrides);
    return k === null ? settings.autoApply : !!overrides[k];
  }

  // Tracked open shadow roots so restore/setHighlight can reach into them.
  const shadowRoots = new Set();

  // Re-entrancy guards.
  let processing = false; // true while we mutate the DOM (apply/restore/dynamic)

  // Init reads storage asynchronously; hold BR_GET_STATE replies until it lands
  // so a popup that just injected us never sees stale/default state.
  let inited = false;
  const pendingStateResponders = [];

  // --- Constants -----------------------------------------------------------
  const SEG_CLASS = 'br-seg';
  const FX_CLASS = 'br-fx';

  // Tags whose text we never touch.
  const SKIP_TAGS = new Set([
    'script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp',
    'textarea', 'input', 'select', 'button', 'svg', 'canvas',
    'video', 'audio', 'img', 'picture', 'iframe', 'object', 'embed',
    'math', 'head', 'title', 'template'
  ]);

  // Landmark/role regions to skip (page chrome).
  const SKIP_LANDMARK_SELECTOR =
    'nav, header, footer, aside,' +
    '[role=navigation], [role=banner], [role=contentinfo], [role=search],' +
    '[role=menu], [role=menubar], [role=toolbar]';

  // Highlight inline styles (applied on each <b class="br-fx">).
  const HL_BG = 'rgba(245,165,36,.28)';
  const HL_RADIUS = '.18em';
  const HL_SHADOW = '0 0 0 .03em rgba(245,165,36,.30)';

  // Unicode word splitter: pre (leading non-word), core (word incl. internal ' ’ -), post.
  const WORD_RE = /^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)?([\s\S]*)$/u;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  const ric =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback.bind(window)
      : (fn) => setTimeout(() => fn({ timeRemaining: () => 0, didTimeout: true }), 0);

  // =========================================================================
  // Bionic rendering
  // =========================================================================

  // Apply highlight styles to a single <b class="br-fx"> based on `highlight`.
  function styleFx(b) {
    if (highlight) {
      b.style.backgroundColor = HL_BG;
      b.style.borderRadius = HL_RADIUS;
      b.style.boxShadow = HL_SHADOW;
    } else {
      b.style.backgroundColor = '';
      b.style.borderRadius = '';
      b.style.boxShadow = '';
    }
  }

  // Build a bold prefix node for a word core.
  function makeFx(text) {
    const b = document.createElement('b');
    b.className = FX_CLASS;
    // Inline weight beats site CSS without !important wars; works in shadow DOM.
    b.style.fontWeight = '700';
    b.appendChild(document.createTextNode(text));
    styleFx(b);
    return b;
  }

  // Append the bionic-rendered pieces of one non-space token to `seg`.
  function renderToken(seg, token) {
    const m = WORD_RE.exec(token);
    // m always matches (post is [\s\S]*). If no word core, append verbatim.
    if (!m || !m[2]) {
      seg.appendChild(document.createTextNode(token));
      return;
    }
    const pre = m[1] || '';
    const core = m[2];
    const post = m[3] || '';

    if (pre) seg.appendChild(document.createTextNode(pre));

    const ratio = settings.intensity;
    const boldLen = clamp(Math.ceil(core.length * ratio), 1, core.length);
    seg.appendChild(makeFx(core.slice(0, boldLen)));
    const rest = core.slice(boldLen);
    if (rest) seg.appendChild(document.createTextNode(rest));

    if (post) seg.appendChild(document.createTextNode(post));
  }

  // Replace a single text node with one <span class="br-seg"> wrapper.
  function transformTextNode(node) {
    const original = node.nodeValue; // verbatim, never trimmed
    const seg = document.createElement('span');
    seg.className = SEG_CLASS;
    // Visually inert: group children + enable faithful restore, no box effects.
    seg.style.display = 'inline';
    seg.__brOriginal = original;

    // Split preserving whitespace runs as their own pieces.
    const pieces = original.split(/(\s+)/);
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece === '') continue;
      if (/^\s+$/.test(piece)) {
        seg.appendChild(document.createTextNode(piece));
      } else {
        renderToken(seg, piece);
      }
    }

    const parent = node.parentNode;
    if (parent) parent.replaceChild(seg, node);
  }

  // =========================================================================
  // Scope / denylist walk
  // =========================================================================

  // Per-walk cache of getComputedStyle display/visibility results, keyed by element.
  function makeAcceptNode(displayCache) {
    return function acceptNode(node) {
      const text = node.nodeValue;
      if (!text || !/\S/.test(text)) return NodeFilter.FILTER_REJECT;

      const parent = node.parentNode;
      if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
        return NodeFilter.FILTER_REJECT;
      }
      const el = /** @type {Element} */ (parent);

      // CRITICAL anti-recursion guard: never reprocess our own output.
      if (el.closest('.' + SEG_CLASS)) return NodeFilter.FILTER_REJECT;

      // Skip-tag ancestor (walk up the chain).
      for (let cur = el; cur && cur.nodeType === Node.ELEMENT_NODE; cur = cur.parentElement) {
        const tag = cur.localName;
        if (tag && SKIP_TAGS.has(tag)) return NodeFilter.FILTER_REJECT;
      }

      // Landmarks / regions to skip.
      if (el.closest(SKIP_LANDMARK_SELECTOR)) return NodeFilter.FILTER_REJECT;

      // Editable or aria-hidden regions.
      if (el.closest('[contenteditable=""], [contenteditable="true"], [contenteditable]')) {
        // closest('[contenteditable]') also matches contenteditable="false"; verify.
        const ce = el.closest('[contenteditable]');
        if (ce) {
          const v = ce.getAttribute('contenteditable');
          if (v === '' || v === 'true') return NodeFilter.FILTER_REJECT;
        }
      }
      if (el.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;

      // Hidden or CSS-preformatted regions: check nearest ancestor, cached.
      if (!isEligible(el, displayCache)) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    };
  }

  // Should text under `el` be transformed? Rejects hidden elements and
  // CSS-preformatted regions (white-space: pre / pre-wrap / break-spaces) where
  // inserting element boundaries can disturb alignment in code/aligned views.
  // Computed style is read once per element and cached for the walk.
  function isEligible(el, cache) {
    if (cache.has(el)) return cache.get(el);
    let ok = true;
    try {
      const cs = getComputedStyle(el);
      if (cs) {
        const ws = cs.whiteSpace;
        if (cs.display === 'none' || cs.visibility === 'hidden') ok = false;
        else if (ws === 'pre' || ws === 'pre-wrap' || ws === 'break-spaces') ok = false;
      }
    } catch (_e) {
      ok = true; // if we can't compute, don't block.
    }
    cache.set(el, ok);
    return ok;
  }

  // Collect qualifying text nodes under `root`, descending into open shadow roots.
  function collectTextNodes(root, out) {
    const displayCache = new Map();
    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        { acceptNode: makeAcceptNode(displayCache) }
      );
      let n;
      while ((n = walker.nextNode())) out.push(n);
    } catch (_e) { /* resilient */ }

    // Descend into open shadow roots found within `root`.
    try {
      const scope = root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ? root
        : null;
      const elements = [];
      if (scope && typeof scope.querySelectorAll === 'function') {
        elements.push(...scope.querySelectorAll('*'));
      }
      // If root itself is an element with a shadow root, include it.
      if (root.nodeType === Node.ELEMENT_NODE) elements.unshift(root);
      for (const el of elements) {
        const sr = el.shadowRoot;
        if (sr) {
          if (!shadowRoots.has(sr)) shadowRoots.add(sr);
          collectTextNodes(sr, out);
        }
      }
    } catch (_e) { /* resilient */ }
  }

  // =========================================================================
  // Apply / restore (chunked, observer-safe)
  // =========================================================================

  // Monotonic token bumped by every full transition (apply/restore/dynamic).
  // A superseded chunked apply checks it and aborts instead of fighting the new
  // transition — this is the single-flight guard for all DOM mutation.
  let applyGen = 0;

  function applyToNodes(nodes, gen, done) {
    const CHUNK = 200;
    let i = 0;
    function step() {
      if (gen !== applyGen) return; // superseded by a newer transition — abort.
      const end = Math.min(i + CHUNK, nodes.length);
      for (; i < end; i++) {
        const node = nodes[i];
        // Node may have been detached since collection; guard.
        if (node && node.parentNode) {
          try { transformTextNode(node); } catch (_e) { /* skip bad node */ }
        }
      }
      if (i < nodes.length) {
        ric(step);
      } else if (typeof done === 'function') {
        done();
      }
    }
    if (nodes.length === 0) {
      if (typeof done === 'function') done();
      return;
    }
    ric(step);
  }

  // Full-document apply (also covers tracked + freshly discovered shadow roots).
  function apply() {
    cancelPending();
    processing = true;
    stopObserver();
    const gen = ++applyGen;
    const nodes = [];
    if (document.body) collectTextNodes(document.body, nodes);
    log('apply: collected', nodes.length, 'text nodes');
    applyToNodes(nodes, gen, () => {
      if (gen !== applyGen) return;
      processing = false;
      startObserver();
    });
  }

  // Faithful restore: replace every wrapper with its verbatim original text,
  // then normalize parents to merge adjacent text nodes. Works in shadow DOM.
  function restore() {
    cancelPending();
    ++applyGen; // cancel any in-flight chunked apply
    processing = true;
    stopObserver();
    try {
      const roots = [document];
      for (const sr of shadowRoots) roots.push(sr);
      for (const root of roots) {
        let segs;
        try {
          segs = root.querySelectorAll('span.' + SEG_CLASS);
        } catch (_e) {
          continue;
        }
        const parents = new Set();
        segs.forEach((seg) => {
          const parent = seg.parentNode;
          try {
            seg.replaceWith(document.createTextNode(seg.__brOriginal != null ? seg.__brOriginal : seg.textContent));
            if (parent) parents.add(parent);
          } catch (_e) { /* skip */ }
        });
        parents.forEach((p) => { try { p.normalize(); } catch (_e) {} });
      }
    } catch (_e) { /* resilient */ }
    processing = false;
    // The observer lifecycle is owned by apply() (start) and setActive(off)
    // (stop). restore() never restarts it: callers either follow with apply()
    // (intensity change) or are turning the effect off.
  }

  // =========================================================================
  // Highlight toggle (instant; no re-walk)
  // =========================================================================

  function setHighlight(on) {
    highlight = !!on;
    const roots = [document];
    for (const sr of shadowRoots) roots.push(sr);
    for (const root of roots) {
      let fx;
      try {
        fx = root.querySelectorAll('b.' + FX_CLASS);
      } catch (_e) {
        continue;
      }
      fx.forEach((b) => styleFx(b)); // styleFx reads the updated `highlight`
    }
  }

  // =========================================================================
  // MutationObserver (dynamic content)
  // =========================================================================

  let observer = null;
  let pendingRoots = [];
  let debounceTimer = null;

  function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!active || processing) return;
      try {
        for (const m of mutations) {
          if (m.type !== 'childList') continue;
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              // Ignore additions inside our own output.
              if (node.nodeType === Node.ELEMENT_NODE && node.closest && node.closest('.' + SEG_CLASS)) return;
              if (node.nodeType === Node.TEXT_NODE) {
                const p = node.parentElement;
                if (p && p.closest && p.closest('.' + SEG_CLASS)) return;
              }
              pendingRoots.push(node);
            }
          });
        }
        scheduleDynamic();
      } catch (_e) { /* resilient */ }
    });
  }

  function startObserver() {
    if (!active) return;
    ensureObserver();
    try {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_e) { /* resilient */ }
  }

  function stopObserver() {
    if (observer) {
      try { observer.disconnect(); } catch (_e) {}
    }
  }

  function scheduleDynamic() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processDynamic, 120);
  }

  // Drop any queued dynamic work — called by full transitions that will re-walk.
  function cancelPending() {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    pendingRoots = [];
  }

  function processDynamic() {
    debounceTimer = null;
    if (!active) { pendingRoots = []; return; }
    // A full apply/restore is mid-flight; retry once it settles.
    if (processing) { scheduleDynamic(); return; }
    const roots = pendingRoots;
    pendingRoots = [];
    if (roots.length === 0) return;

    processing = true;
    stopObserver();
    const gen = ++applyGen;
    const nodes = [];
    const displayCache = new Map();
    const accept = makeAcceptNode(displayCache);
    try {
      for (const node of roots) {
        if (!node || !node.isConnected) continue;
        if (node.nodeType === Node.TEXT_NODE) {
          // Re-validate the bare added text node directly against the denylist.
          if (accept(node) === NodeFilter.FILTER_ACCEPT) nodes.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          collectTextNodes(node, nodes);
        }
      }
    } catch (_e) { /* resilient */ }

    applyToNodes(nodes, gen, () => {
      if (gen !== applyGen) return;
      processing = false;
      startObserver();
    });
  }

  // =========================================================================
  // Effective-active computation + transitions
  // =========================================================================

  function setActive(next, persist) {
    next = !!next;
    if (next === active) return; // no state change; nothing to do
    active = next;
    if (active) {
      apply();
    } else {
      restore();
      stopObserver();
    }
    if (persist) persistOverride(active);
    notifyBackground(active);
  }

  // Persist the per-site choice. Writes to the key that actually governs this
  // page — the longest matching override if one exists, otherwise a new key at
  // the registrable domain. This keeps the engine's read key and the toggle's
  // write key in agreement (a subdomain-specific entry must win, not get
  // shadowed). We only CREATE new memory when "Remember" is on; an existing
  // saved choice is always corrected so an explicit on/off sticks.
  function persistOverride(value) {
    try {
      chrome.storage.local.get({ overrides: {} }, (data) => {
        const overrides = data && data.overrides ? data.overrides : {};
        const matched = matchingOverrideKey(overrides);
        if (!settings.remember && matched === null) return; // session-only, don't memorize
        overrides[matched !== null ? matched : host] = value;
        chrome.storage.local.set({ overrides });
      });
    } catch (_e) { /* resilient */ }
  }

  function notifyBackground(isActive) {
    try {
      chrome.runtime.sendMessage({ type: 'BR_STATE_CHANGED', active: isActive }, () => {
        // Swallow "no receiving end" errors.
        void chrome.runtime.lastError;
      });
    } catch (_e) { /* resilient */ }
  }

  // =========================================================================
  // Storage init + reactions
  // =========================================================================

  function init() {
    let pendingSync = true;
    let pendingLocal = true;
    let loadedSettings = { ...DEFAULT_SETTINGS };
    let loadedOverrides = {};

    const finish = () => {
      if (pendingSync || pendingLocal) return;
      settings = {
        intensity: typeof loadedSettings.intensity === 'number' ? loadedSettings.intensity : DEFAULT_SETTINGS.intensity,
        highlight: typeof loadedSettings.highlight === 'boolean' ? loadedSettings.highlight : DEFAULT_SETTINGS.highlight,
        autoApply: typeof loadedSettings.autoApply === 'boolean' ? loadedSettings.autoApply : DEFAULT_SETTINGS.autoApply,
        remember: typeof loadedSettings.remember === 'boolean' ? loadedSettings.remember : DEFAULT_SETTINGS.remember
      };
      highlight = settings.highlight;
      active = effectiveActive(loadedOverrides);
      log('init: active=', active, 'settings=', settings);
      if (active) {
        ensureObserver();
        apply();
      }
      // Mirror initial state onto the toolbar icon. apply() runs through its own
      // path (not setActive), so the icon must be announced explicitly here —
      // otherwise an auto-applied page would show an inactive icon all session.
      notifyBackground(active);

      // Release any popup state requests that arrived before init finished.
      inited = true;
      while (pendingStateResponders.length) respondState(pendingStateResponders.shift());
    };

    try {
      chrome.storage.sync.get({ settings: DEFAULT_SETTINGS }, (data) => {
        if (data && data.settings) loadedSettings = data.settings;
        pendingSync = false;
        finish();
      });
    } catch (_e) { pendingSync = false; finish(); }

    try {
      chrome.storage.local.get({ overrides: {} }, (data) => {
        if (data && data.overrides) loadedOverrides = data.overrides;
        pendingLocal = false;
        finish();
      });
    } catch (_e) { pendingLocal = false; finish(); }
  }

  function readEffectiveActive(cb) {
    try {
      chrome.storage.local.get({ overrides: {} }, (data) => {
        const overrides = data && data.overrides ? data.overrides : {};
        cb(effectiveActive(overrides), matchingOverrideKey(overrides) !== null);
      });
    } catch (_e) {
      cb(active, false);
    }
  }

  function handleStorageChange(changes, area) {
    try {
      if (area === 'sync' && changes.settings) {
        const oldS = changes.settings.oldValue || {};
        const newS = changes.settings.newValue || {};
        const merged = {
          intensity: typeof newS.intensity === 'number' ? newS.intensity : DEFAULT_SETTINGS.intensity,
          highlight: typeof newS.highlight === 'boolean' ? newS.highlight : DEFAULT_SETTINGS.highlight,
          autoApply: typeof newS.autoApply === 'boolean' ? newS.autoApply : DEFAULT_SETTINGS.autoApply,
          remember: typeof newS.remember === 'boolean' ? newS.remember : DEFAULT_SETTINGS.remember
        };
        const prevSettings = settings;
        settings = merged;

        // Intensity change while active → re-split (restore then re-apply).
        if (active && merged.intensity !== prevSettings.intensity) {
          restore();
          apply();
        }

        // Highlight change → instant toggle, no re-walk.
        if (merged.highlight !== prevSettings.highlight) {
          setHighlight(merged.highlight);
        }

        // autoApply change → only affects sites WITHOUT an explicit override.
        if (merged.autoApply !== prevSettings.autoApply) {
          readEffectiveActive((eff, hasOverride) => {
            if (hasOverride) return; // an explicit per-site choice always wins
            if (merged.autoApply) {
              // Turning auto-apply ON: enable a page that was following the default.
              if (!active) setActive(true, false);
            }
            // Turning auto-apply OFF: leave open pages exactly as they are for
            // this session. We never auto-save them — memory comes only from the
            // master toggle (when "Remember" is on) or from adding sites explicitly.
          });
        }
      }

      if (area === 'local' && changes.overrides) {
        // Recompute this host's effective active and match the DOM.
        readEffectiveActive((eff) => setActive(eff, false));
      }
    } catch (_e) { /* resilient */ }
  }

  try {
    chrome.storage.onChanged.addListener(handleStorageChange);
  } catch (_e) { /* resilient */ }

  // =========================================================================
  // Message protocol
  // =========================================================================

  // Reply to BR_GET_STATE with the current active flag, host (registrable
  // domain), live settings, and whether this site has an explicit override.
  function respondState(sendResponse) {
    try {
      chrome.storage.local.get({ overrides: {} }, (data) => {
        const overrides = data && data.overrides ? data.overrides : {};
        const hasOverride = matchingOverrideKey(overrides) !== null;
        sendResponse({ active, host, settings, hasOverride });
      });
    } catch (_e) {
      sendResponse({ active, host, settings, hasOverride: false });
    }
  }

  function handleMessage(message, _sender, sendResponse) {
    if (!message || typeof message.type !== 'string') return false;
    switch (message.type) {
      case 'BR_PING':
        sendResponse({ ok: true });
        return true;

      case 'BR_GET_STATE': {
        if (!inited) { pendingStateResponders.push(sendResponse); return true; }
        respondState(sendResponse);
        return true;
      }

      case 'BR_TOGGLE': {
        const next = !active;
        setActive(next, true); // persistOverride() decides whether to memorize
        sendResponse({ active });
        return true;
      }

      case 'BR_SET_ACTIVE': {
        setActive(!!message.active, true);
        sendResponse({ active });
        return true;
      }

      default:
        return false;
    }
  }

  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        return handleMessage(message, sender, sendResponse);
      } catch (_e) {
        return false;
      }
    });
  } catch (_e) { /* resilient */ }

  // --- Kick off ------------------------------------------------------------
  init();
})();
