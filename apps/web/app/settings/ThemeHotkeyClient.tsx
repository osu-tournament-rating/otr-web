'use client';

import { Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useSetThemeHotkeyEnabled,
  useThemeHotkeyEnabled,
} from '@/lib/hooks/useThemeHotkey';
import { cn } from '@/lib/utils';

export default function ThemeHotkeyClient() {
  const enabled = useThemeHotkeyEnabled();
  const setEnabled = useSetThemeHotkeyEnabled();
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (highlightParam !== 'theme-hotkey') return;

    setHighlighted(true);
    window.history.replaceState({}, '', '/settings');
    document
      .getElementById('theme-hotkey')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightParam]);

  useEffect(() => {
    if (!highlighted) return;

    const timer = setTimeout(() => setHighlighted(false), 2000);
    return () => clearTimeout(timer);
  }, [highlighted]);

  return (
    <Card
      id="theme-hotkey"
      data-testid="settings-theme-hotkey-section"
      className={cn(
        'transition-all duration-300',
        highlighted && 'ring-2 ring-yellow-400 ring-offset-2'
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <Keyboard className="size-6 text-primary" />
          <CardTitle>Keyboard shortcuts</CardTitle>
        </div>
        <CardDescription>
          Ctrl+L switches between the light and dark theme.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="theme-hotkey-switch" className="font-normal">
            Toggle the theme with Ctrl+L
          </Label>
          <Switch
            id="theme-hotkey-switch"
            data-testid="settings-theme-hotkey-switch"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
}
