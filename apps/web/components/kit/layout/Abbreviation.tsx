import TapTooltip from '@/components/tap-tooltip';
import { midSentence } from '@/lib/kit/layout/about-label';
import { cn } from '@/lib/utils';

/**
 * A short form, such as CS for circle size, whose full form opens on tap,
 * hover and keyboard focus. It replaces `<abbr title>`, whose title only
 * shows on a mouse hover. Screen readers hear the short form, then the full
 * one ("CS, circle size"), so the name starts with the text on screen and
 * speech input that says "CS" reaches it. Use it in labels where the short
 * form is the established name: stat tiles, table headers, filter labels.
 * Its tap target is at least 24px square, past the text, so leave 4px
 * between it and the next control.
 */
export function Abbreviation({
  full,
  side = 'top',
  className,
  children,
}: {
  /** The full form, in sentence case: "Circle size". */
  full: string;
  /** The short form shown: "CS". The accessible name starts with it. */
  children: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  return (
    <TapTooltip
      side={side}
      align="start"
      content={full}
      triggerAriaLabel={`${children}, ${midSentence(full)}`}
      triggerClassName={cn(
        // Sits in the line like text; the dotted underline is the cue.
        'relative inline w-auto underline decoration-muted-foreground/60 decoration-dotted underline-offset-2',
        // Widens the hit area to at least 24px each way, 4px past the text
        // on either side, without moving the text, as InfoButton does.
        'after:absolute after:top-1/2 after:left-1/2 after:h-6 after:w-[calc(100%+0.5rem)] after:min-w-6 after:-translate-1/2',
        className
      )}
    >
      {children}
    </TapTooltip>
  );
}
