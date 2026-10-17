'use client';

import { useId } from 'react';

import { Switch } from '@/components/ui/switch';

/**
 * "Show system events": a visible switch that leads the toolbar strip (its
 * `leading` slot), kept in the address. It widens the list rather than
 * filtering it, so "Clear all" leaves it alone. 40px tall, like the
 * toolbar's other controls.
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
    <div className="flex h-10 items-center gap-2">
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
