'use client';

import { ACCENT_SURFACE_CLASSES } from '@/lib/kit/color/tokens';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

// Keys that move focus on purpose: Tab between controls, arrows inside a
// toolbar or radio group.
const NAVIGATION_KEYS = new Set([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

// Whether the visitor's last input moved focus with the keyboard. Read when a
// trigger gains focus, before anything else can change it.
let lastInputNavigated = false;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'keydown',
    (event) => {
      if (MODIFIER_KEYS.has(event.key)) return;
      lastInputNavigated = NAVIGATION_KEYS.has(event.key);
    },
    true
  );
  document.addEventListener(
    'pointerdown',
    () => {
      lastInputNavigated = false;
    },
    true
  );
}

function TooltipTrigger({
  onFocus,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onFocus={(event) => {
        onFocus?.(event);
        // Open on focus only when the visitor moved there with the keyboard.
        // A menu, popover or dialog hands focus back to its trigger as it
        // closes, after a click, Escape or a chosen item, often as
        // :focus-visible, and that would pop the tooltip open once the
        // visitor is done with it
        // (https://github.com/radix-ui/primitives/issues/2248). Radix skips
        // its open handler when the event is default-prevented.
        if (
          !event.currentTarget.matches(':focus-visible') ||
          !lastInputNavigated
        ) {
          event.preventDefault();
        }
      }}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 0,
  hideArrow = false,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  hideArrow?: boolean;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          // Muted text inside reads the accent surface's own muted colour.
          ACCENT_SURFACE_CLASSES,
          className
        )}
        {...props}
      >
        {children}
        {!hideArrow && (
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-accent fill-accent" />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
