'use client';

import { Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { SETTINGS_COPY } from '@/app/settings/settings-copy';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  setThemeHotkeyEnabled,
  useThemeHotkeyEnabled,
} from '@/lib/hooks/useThemeHotkey';
import { cn } from '@/lib/utils';

export default function ThemeHotkeyClient() {
  const enabled = useThemeHotkeyEnabled();
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
    <Panel
      id="theme-hotkey"
      data-testid="settings-theme-hotkey-section"
      className={cn(
        'transition-shadow duration-300',
        // Arriving from the "Ctrl+L toggled the theme" toast, the panel is
        // marked for a moment so the switch is easy to find.
        highlighted &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <SectionHeader icon={Keyboard} title="Keyboard shortcuts" />
      <PanelBody className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {SETTINGS_COPY.shortcuts}
        </p>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="theme-hotkey-switch" className="font-normal">
            Toggle the theme with Ctrl+L
          </Label>
          <Switch
            id="theme-hotkey-switch"
            data-testid="settings-theme-hotkey-switch"
            checked={enabled}
            onCheckedChange={setThemeHotkeyEnabled}
            className="cursor-pointer"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}
