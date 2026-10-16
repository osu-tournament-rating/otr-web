import Image from 'next/image';
import TapTooltip from '../tap-tooltip';
import { getTierString } from '@/lib/utils/tierData';
import { cn } from '@/lib/utils';

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
  className,
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  tier: TierName;
  subTier: number | undefined;
  /** Names the tier in a tooltip that opens on hover, tap and keyboard focus. */
  tooltip?: boolean;
}) {
  const fileName =
    tier === 'Elite Grandmaster'
      ? 'Elite Grandmaster'
      : `${tier}${subTier ?? ''}`;
  const tierString = getTierString(tier, subTier);

  if (!tooltip) {
    return (
      <Image
        src={`/icons/tiers/${fileName}.svg`}
        alt={tierString}
        className={className}
        {...rest}
      />
    );
  }

  // The button carries the name, so the image inside is decorative. It stays
  // inline like the plain image, so it can sit in a line of text.
  return (
    <TapTooltip
      content={tierString}
      triggerAriaLabel={`Tier: ${tierString}`}
      triggerClassName="inline-flex w-auto shrink-0 rounded-full"
    >
      <Image
        src={`/icons/tiers/${fileName}.svg`}
        alt=""
        className={cn('block', className)}
        {...rest}
      />
    </TapTooltip>
  );
}
