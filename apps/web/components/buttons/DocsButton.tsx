import { Book } from 'lucide-react';
import Link from 'next/link';
import { iconButtonStyle } from './IconButton';
import { Button } from '../ui/button';

export default function DocsButton() {
  return (
    <Link href={'https://docs.otr.stagec.xyz'} target="_blank">
      <Button
        aria-label="Docs"
        className="hover:text-primary cursor-pointer"
        variant="ghost"
        size="icon"
      >
        <Book className={iconButtonStyle()} />
      </Button>
    </Link>
  );
}
