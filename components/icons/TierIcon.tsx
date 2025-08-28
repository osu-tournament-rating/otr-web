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
  const fileName =
    tier === 'Elite Grandmaster'
      ? 'Elite Grandmaster'
      : `${tier}${subTier ?? ''}`;

  const imageElement = (
    <Image
      src={`/icons/tiers/${fileName}.svg`}
      alt={tier + subTier?.toString()}
      {...rest}
    />
  );

  if (!tooltip) {
    return imageElement;
  }

  const tooltipContent = getTierString(tier, subTier);

  // Here purely for convenience
  if (tier === 'Elite Grandmaster') {
    subTier = undefined;
  }

  return <SimpleTooltip content={tooltipContent}>{imageElement}</SimpleTooltip>;
}
