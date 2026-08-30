'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';

const STORAGE_KEY = 'otr-theme-hotkey-enabled';
const CHANGE_EVENT = 'otr-theme-hotkey-change';

// Mirrored once per sign-in
let seededUserId: number | null = null;

function readStored() {
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
  const user = useSession();
  const stored = useSyncExternalStore(subscribe, readStored, () => true);
  const userId = user?.userId ?? null;

  useEffect(() => {
    if (!user || userId === null) {
      seededUserId = null;
      return;
    }

    if (seededUserId === userId) return;

    seededUserId = userId;
    setThemeHotkeyEnabled(user.themeHotkeyEnabled);
  }, [user, userId]);

  if (user && userId !== null && seededUserId !== userId) {
    return user.themeHotkeyEnabled;
  }

  return stored;
}

export function useSetThemeHotkeyEnabled() {
  const user = useSession();

  return useCallback(
    async (enabled: boolean) => {
      setThemeHotkeyEnabled(enabled);

      if (!user) return;

      try {
        await orpc.users.updateMySettings({ themeHotkeyEnabled: enabled });
      } catch {
        setThemeHotkeyEnabled(!enabled);
        toast.error('Failed to save the shortcut setting');
      }
    },
    [user]
  );
}
