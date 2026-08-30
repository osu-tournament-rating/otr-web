'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'otr-theme-hotkey-enabled';
const CHANGE_EVENT = 'otr-theme-hotkey-change';

function isThemeHotkeyEnabled() {
  if (typeof window === 'undefined') return true;

  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setThemeHotkeyEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage is unavailable in some private browsing modes.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useThemeHotkeyEnabled() {
  return useSyncExternalStore(subscribe, isThemeHotkeyEnabled, () => true);
}
