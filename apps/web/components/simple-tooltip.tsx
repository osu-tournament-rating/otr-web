'use client';

import { PointerEvent, ReactNode, useRef, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
  // Touch browsers can emit compatibility mouse events without supporting hover.
  if (!window.matchMedia('(any-hover: hover)').matches) {
    event.preventDefault();
  }
}

interface SimpleTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  collisionPadding?: number;
  /**
   * Merge the trigger onto `children` instead of wrapping them in the trigger
   * button, which leaves the tooltip reachable by pointer hover and by keyboard
   * focus but not by tap. Only for a child that is already focusable, that sits
   * where a nested control is not allowed, or that already carries the tooltip's
   * information in alt text, an `sr-only` label, or adjacent visible text.
   */
  asChild?: boolean;
  /** Classes for the trigger button. Ignored when `asChild` is set. */
  triggerClassName?: string;
  /**
   * Accessible name for a trigger whose visible content is decorative. Ignored
   * when `asChild` is set, where the child owns its own name.
   */
  triggerAriaLabel?: string;
}

/**
 * Hover or focus shows a tooltip; tap or click pins the same content in a
 * popover so touch users can read it too.
 *
 * A component rendered in many places cannot tell whether an ancestor is a
 * control, so it takes that from its call site rather than choosing here; see
 * `VerificationBadge` and `RelativeTime` for the shape that takes.
 */
export default function SimpleTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  collisionPadding = 8,
  asChild = false,
  triggerClassName,
  triggerAriaLabel,
}: SimpleTooltipProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const restoringPopoverFocus = useRef(false);

  const tooltipContent = (
    <TooltipContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
    >
      {content}
    </TooltipContent>
  );

  if (asChild) {
    return (
      <Tooltip>
        <TooltipTrigger asChild onPointerMove={handlePointerMove}>
          {children}
        </TooltipTrigger>
        {tooltipContent}
      </Tooltip>
    );
  }

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={(open) => {
        setPopoverOpen(open);
        setTooltipOpen(false);
      }}
    >
      <Tooltip
        open={tooltipOpen && !popoverOpen}
        onOpenChange={(open) =>
          setTooltipOpen(open && !popoverOpen && !restoringPopoverFocus.current)
        }
      >
        <TooltipTrigger asChild onPointerMove={handlePointerMove}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={triggerAriaLabel}
              className={cn(
                // Sized and shrunk like the element it wraps, so it does not
                // change the layout around it.
                'inline-flex w-fit min-w-0 cursor-pointer items-center rounded-sm text-left',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                triggerClassName
              )}
            >
              {children}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {tooltipContent}
      </Tooltip>
      {/* Same surface as the tooltip above: accent, no border */}
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="w-auto max-w-[calc(100vw-2rem)] border-0 bg-accent p-3 text-xs text-accent-foreground"
        onCloseAutoFocus={() => {
          // Radix restores trigger focus synchronously after this callback.
          // Preserve focus without replacing the dismissed popover with a tooltip.
          restoringPopoverFocus.current = true;
          queueMicrotask(() => {
            restoringPopoverFocus.current = false;
          });
        }}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
