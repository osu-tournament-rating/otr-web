import Image from 'next/image';
import SimpleTooltip from '../simple-tooltip';
import { TierName } from '@/lib/tierData';

export default function TierIcon({
  tier,
  tooltip = true,
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  /** Target tier */
  tier: TierName;

  /** If a tooltip with the tier text should be attached to the icon */
  tooltip?: boolean;
}) {
  const Icon = () => (
    <Image src={`/icons/tiers/${tier}.svg`} alt={tier} {...rest} />
  );

  if (!tooltip) {
    return <Icon />;
  }

  return (
    <SimpleTooltip content={tier}>
      <Icon />
    </SimpleTooltip>
  );
}
