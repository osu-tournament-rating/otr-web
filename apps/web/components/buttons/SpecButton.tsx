import Link from 'next/link';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';
import { iconButtonStyle } from './IconButton';
import { FileCode } from 'lucide-react';

export default function SpecButton() {
  return (
    <SimpleTooltip content="OpenAPI specification">
      <Button
        asChild
        aria-label="API spec"
        className="cursor-pointer hover:text-primary"
        variant="ghost"
        size="icon"
      >
        <Link href="/spec" prefetch={false}>
          <FileCode className={iconButtonStyle()} />
        </Link>
      </Button>
    </SimpleTooltip>
  );
}
