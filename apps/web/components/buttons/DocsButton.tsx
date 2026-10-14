import { Book } from 'lucide-react';
import Link from 'next/link';
import { iconButtonStyle } from './IconButton';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';

export default function DocsButton() {
  return (
    <SimpleTooltip content="Read the docs">
      <Button
        asChild
        aria-label="Docs"
        className="cursor-pointer hover:text-primary"
        variant="ghost"
        size="icon"
      >
        <Link href={'https://docs.otr.stagec.net'} target="_blank">
          <Book className={iconButtonStyle()} />
        </Link>
      </Button>
    </SimpleTooltip>
  );
}
