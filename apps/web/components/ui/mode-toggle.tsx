'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { useHotkeys } from 'react-hotkeys-hook';
import { useState, useEffect } from 'react';

export function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  useHotkeys('CTRL+L', (e) => {
    e.preventDefault();
    toggleTheme();
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
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
