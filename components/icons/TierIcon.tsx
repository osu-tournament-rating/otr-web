import Image from 'next/image';
import SimpleTooltip from '../simple-tooltip';
import { getTierString } from '@/lib/utils/tierData';

export const validTiers = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
  'Master',
  'Grandmaster',
  'Elite Grandmaster',
] as const;

// Create a type from the valid tiers array
type TierName = (typeof validTiers)[number];

export default function TierIcon({
  tier,
  subTier,
  tooltip,
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  /** Target tier */
  tier: TierName;

  /** Optional target subtier */
  subTier: number | undefined;

  /** If a tooltip with the tier text should be attached to the icon */
  tooltip?: boolean;
}) {
  const Icon = () => (
    <Image
      src={`/icons/tiers/${tier}${subTier ?? ''}.svg`}
      alt={tier + subTier?.toString()}
      {...rest}
    />
  );

  if (!tooltip) {
    return <Icon />;
  }

  const tooltipContent = getTierString(tier, tooltip ? subTier : undefined);

  // Here purely for convenience
  if (tier === 'Elite Grandmaster') {
    subTier = undefined;
  }

  return (
    <SimpleTooltip content={tooltipContent}>
      <Icon />
    </SimpleTooltip>
  );
}
