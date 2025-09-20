import { HeartIcon } from 'lucide-react';
import { iconButtonStyle } from './IconButton';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';
import Link from 'next/link';

export default function SupportButton() {
  return (
    <Link href="https://buymeacoffee.com/stagecodes" target="_blank">
      <SimpleTooltip content="Support the project">
        <Button
          className="cursor-pointer hover:animate-pulse hover:text-pink-500"
          variant="ghost"
          size="icon"
        >
          <HeartIcon className={iconButtonStyle()} />
        </Button>
      </SimpleTooltip>
    </Link>
  );
}
