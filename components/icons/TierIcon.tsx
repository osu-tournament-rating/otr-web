import Image from 'next/image';
import SimpleTooltip from '../simple-tooltip';

export const validTiers = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
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
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  tier: TierName;
  subTier: number | undefined;
}) {
  // We still use validTiers at runtime to ensure the tier is valid
  // This prevents the ESLint error about validTiers only being used as a type
  if (!validTiers.includes(tier)) {
    console.warn(`Invalid tier: ${tier}`);
  }

  console.log(tier, subTier)

  return (
    <SimpleTooltip content={tier}>
      <Image
        src={`/icons/tiers/${tier}${subTier ?? ''}.svg`}
        alt={tier + subTier?.toString()}
        {...rest}
      />
    </SimpleTooltip>
  );
}
