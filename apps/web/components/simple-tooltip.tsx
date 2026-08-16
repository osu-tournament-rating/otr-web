'use client';

import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SimpleTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  collisionPadding?: number;
}

export default function SimpleTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  collisionPadding = 8,
}: SimpleTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {/* Defaults match TapTooltip */}
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
