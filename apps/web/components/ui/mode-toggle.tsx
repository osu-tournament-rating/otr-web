'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useHotkeys } from 'react-hotkeys-hook';
import { useState, useEffect } from 'react';
import { useSession } from '@/lib/hooks/useSession';
import { useThemeHotkeyEnabled } from '@/lib/hooks/useThemeHotkey';

const TOAST_STORAGE_KEY = 'otr-theme-hotkey-toast-shown';

export function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const hotkeyEnabled = useThemeHotkeyEnabled();
  const user = useSession();
  const router = useRouter();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const showHotkeyToast = () => {
    if (!user) return;

    try {
      if (localStorage.getItem(TOAST_STORAGE_KEY)) return;
      localStorage.setItem(TOAST_STORAGE_KEY, 'true');
    } catch {
      return;
    }

    toast.custom(
      (id) => (
        <button
          type="button"
          className="w-full cursor-pointer rounded-md p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            toast.dismiss(id);
            router.push('/settings?highlight=theme-hotkey');
          }}
        >
          <p className="text-sm font-medium">Ctrl+L toggled the theme</p>
          <p className="text-xs text-muted-foreground">
            Click here to turn this shortcut off in your settings.
          </p>
        </button>
      ),
      { duration: 10_000, className: 'rounded-md border' }
    );
  };

  useHotkeys(
    'CTRL+L',
    (e) => {
      e.preventDefault();
      toggleTheme();
      showHotkeyToast();
    },
    { enabled: hotkeyEnabled },
    [hotkeyEnabled, resolvedTheme, user, router]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      data-testid="header-theme-toggle"
      className="cursor-pointer"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {mounted && resolvedTheme === 'dark' ? (
        <Moon className="scale-100 rotate-0 transition-all" />
      ) : (
        <Sun className="scale-100 rotate-0 transition-all" />
      )}
    </Button>
  );
}
