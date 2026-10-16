'use client';

import { useId } from 'react';

import { Switch } from '@/components/ui/switch';

/**
 * "Show system events": a visible switch in the toolbar strip, kept in the
 * address. It widens the list rather than filtering it, so "Clear all"
 * leaves it alone.
 */
export function AuditSystemSwitch({
  checked,
  onCheckedChange,
  'data-testid': testId,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  'data-testid'?: string;
}) {
  const id = useId();

  return (
    <div className="flex h-8 items-center gap-2">
      <Switch
        id={id}
        data-testid={testId}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <label htmlFor={id} className="cursor-pointer text-sm font-medium">
        Show system events
      </label>
    </div>
  );
}
