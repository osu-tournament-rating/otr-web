import { IconButton } from '@/components/kit/controls/IconButton';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import { SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const lineClassName =
  'absolute h-[2px] w-full rounded-full bg-current transition-all duration-200 ease-in-out';

/** The phone menu button: three lines that fold into a cross while open. */
export default function MobileNavTrigger({
  isOpen,
  notification,
}: {
  isOpen: boolean;
  /** Something new inside the menu, such as unseen reports. */
  notification?: string;
}) {
  return (
    <SheetTrigger asChild>
      <IconButton
        data-testid="mobile-nav-trigger"
        label={
          notification ? `Navigation menu (${notification})` : 'Navigation menu'
        }
        tooltip="Navigation menu"
        tooltipSide="bottom"
        size="default"
        className="relative lg:hidden"
      >
        <span
          aria-hidden="true"
          className="relative flex h-3 w-4 flex-col justify-between"
        >
          <span
            className={cn(
              lineClassName,
              isOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'
            )}
          />
          <span
            className={cn(
              lineClassName,
              'top-1/2 -translate-y-1/2',
              isOpen ? 'opacity-0' : 'opacity-100'
            )}
          />
          <span
            className={cn(
              lineClassName,
              isOpen ? 'bottom-1/2 translate-y-1/2 -rotate-45' : 'bottom-0'
            )}
          />
        </span>
        {notification && !isOpen ? (
          <NotificationDot
            placement="corner"
            label={notification}
            className="top-1.5 right-1.5 ring-card"
          />
        ) : null}
      </IconButton>
    </SheetTrigger>
  );
}
