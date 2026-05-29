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

  useHotkeys('CTRL+L', (e) => {
    e.preventDefault();
    toggleTheme();
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return (
      <Button className="cursor-pointer" variant="ghost" size="icon" disabled>
        <Sun className="scale-100 rotate-0 transition-all" />
      </Button>
    );
  }

  return (
    <Button
      className="cursor-pointer"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="scale-100 rotate-0 transition-all" />
      ) : (
        <Moon className="scale-100 rotate-0 transition-all" />
      )}
    </Button>
  );
}
