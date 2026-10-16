import { Button, type ButtonProps } from '@/components/kit/controls/Button';

/**
 * The labelled "View" button that opens a row's record in a modal, such as a
 * report on My reports or the admin queue. The row itself stays unclickable.
 * Wrap it in `DialogTrigger asChild`, so focus comes back to it when the
 * dialog closes.
 */
export function ViewButton({
  subject,
  ...props
}: Omit<ButtonProps, 'children' | 'variant' | 'size' | 'icon' | 'asChild'> & {
  /** What opens, for screen readers: "report #1204" reads "View report #1204". */
  subject?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-haspopup="dialog"
      aria-label={subject ? `View ${subject}` : undefined}
      {...props}
      // Last, so it reaches the DOM even as a `DialogTrigger asChild` child,
      // whose own `data-slot="dialog-trigger"` would otherwise replace it.
      data-slot="view-button"
    >
      View
    </Button>
  );
}
