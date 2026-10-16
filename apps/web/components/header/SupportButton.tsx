import { Heart } from 'lucide-react';

import { IconButton } from '@/components/kit/controls/IconButton';

import { SUPPORT_URL } from './navigation';

/**
 * The heart at the top right that opens the project's donation page. On
 * hover it turns pink and pulses, unless the visitor asked for less motion.
 */
export default function SupportButton() {
  return (
    <IconButton
      asChild
      data-testid="header-support"
      label="Support the project (opens in a new tab)"
      tooltip="Support the project"
      icon={Heart}
      size="default"
      tooltipSide="bottom"
      className="hover:text-support motion-safe:hover:animate-pulse"
    >
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" />
    </IconButton>
  );
}
