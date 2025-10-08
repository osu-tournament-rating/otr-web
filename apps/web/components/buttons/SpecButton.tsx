import Link from 'next/link';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';
import { iconButtonStyle } from './IconButton';
import { FileCode } from 'lucide-react';

export default function SpecButton() {
  return (
    <Link href="/spec" prefetch={false}>
      <SimpleTooltip content="OpenAPI specification">
        <Button
          aria-label="API spec"
          className="hover:text-primary cursor-pointer"
          variant="ghost"
          size="icon"
        >
          <FileCode className={iconButtonStyle()} />
        </Button>
      </SimpleTooltip>
    </Link>
  );
}
