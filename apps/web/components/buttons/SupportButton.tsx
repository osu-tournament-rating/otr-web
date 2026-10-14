import { HeartIcon } from 'lucide-react';
import { iconButtonStyle } from './IconButton';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';
import Link from 'next/link';

export default function SupportButton() {
  return (
    <SimpleTooltip content="Support the project">
      <Button
        asChild
        aria-label="Support the project"
        className="cursor-pointer hover:animate-pulse hover:text-pink-500"
        variant="ghost"
        size="icon"
      >
        <Link href="https://buymeacoffee.com/stagecodes" target="_blank">
          <HeartIcon className={iconButtonStyle()} />
        </Link>
      </Button>
    </SimpleTooltip>
  );
}
