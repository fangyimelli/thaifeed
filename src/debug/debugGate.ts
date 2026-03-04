const DEBUG_SESSION_STORAGE_KEY = 'app.debug.enabled';

declare global {
  interface Window {
    __THAIFEED_DEBUG_ENABLED__?: boolean;
  }
}

function isDebugQueryEnabled() {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

function isDebugHashEnabled() {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('debug') === '1';
}

function isDebugSessionEnabled() {
  return window.sessionStorage.getItem(DEBUG_SESSION_STORAGE_KEY) === '1';
}

export function isDebugEnabled() {
  return isDebugQueryEnabled() || isDebugHashEnabled() || isDebugSessionEnabled() || window.__THAIFEED_DEBUG_ENABLED__ === true;
}

export function setDebugOverlayEnabled(enabled: boolean) {
  window.__THAIFEED_DEBUG_ENABLED__ = enabled;
  if (enabled) {
    window.sessionStorage.setItem(DEBUG_SESSION_STORAGE_KEY, '1');
    return;
  }
  if (!isDebugQueryEnabled()) {
    window.sessionStorage.removeItem(DEBUG_SESSION_STORAGE_KEY);
  }
}
