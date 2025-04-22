'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { useHotkeys } from 'react-hotkeys-hook';
import { useState, useEffect } from 'react';

export function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useHotkeys('CTRL+L', (e) => {
    e.preventDefault();
    toggleTheme();
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      className="cursor-pointer"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun className="scale-100 rotate-0 transition-all" />
      ) : (
        <Moon className="scale-100 rotate-0 transition-all" />
      )}
    </Button>
  );
}
