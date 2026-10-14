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

type TierName = (typeof validTiers)[number];

export default function TierIcon({
  tier,
  subTier,
  tooltip,
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  tier: TierName;
  subTier: number | undefined;
  tooltip?: boolean;
}) {
  const fileName =
    tier === 'Elite Grandmaster'
      ? 'Elite Grandmaster'
      : `${tier}${subTier ?? ''}`;
  const tierString = getTierString(tier, subTier);

  const imageElement = (
    <Image src={`/icons/tiers/${fileName}.svg`} alt={tierString} {...rest} />
  );

  if (!tooltip) {
    return imageElement;
  }

  return <SimpleTooltip content={tierString}>{imageElement}</SimpleTooltip>;
}
