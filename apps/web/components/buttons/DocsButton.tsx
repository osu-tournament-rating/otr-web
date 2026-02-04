import { Book } from 'lucide-react';
import Link from 'next/link';
import { iconButtonStyle } from './IconButton';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';

export default function DocsButton() {
  return (
    <Link href={'https://docs.otr.stagec.net'} target="_blank">
      <SimpleTooltip content="Read the docs">
        <Button
          aria-label="Docs"
          className="hover:text-primary cursor-pointer"
          variant="ghost"
          size="icon"
        >
          <Book className={iconButtonStyle()} />
        </Button>
      </SimpleTooltip>
    </Link>
  );
}
