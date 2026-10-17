import {
  PREVIEW_STATUS_ICONS,
  type PreviewButtonStatus,
} from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

/** The glyph for a preview button's state; the loading spinner turns. */
export function PreviewStatusIcon({
  status,
  className,
}: {
  status: PreviewButtonStatus;
  className?: string;
}) {
  const Icon = PREVIEW_STATUS_ICONS[status];

  return (
    <Icon
      aria-hidden
      className={cn(status === 'loading' && 'animate-spin', className)}
    />
  );
}
