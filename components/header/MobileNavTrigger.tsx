import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { SheetTrigger } from '../ui/sheet';

const lineClassName =
  'absolute h-[2px] w-full rounded-full bg-current transition-all duration-200 ease-in-out';

export default function MobileNavTrigger({ isOpen }: { isOpen: boolean }) {
  return (
    <SheetTrigger asChild className="md:hidden">
      <Button variant="ghost" size="icon">
        <div className="relative flex h-3 w-4 flex-col justify-between">
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
        </div>
      </Button>
    </SheetTrigger>
  );
}
