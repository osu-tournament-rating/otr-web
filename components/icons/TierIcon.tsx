import Image from 'next/image';
import SimpleTooltip from '../simple-tooltip';

export const validTiers = [
  'Bronze III',
  'Bronze II',
  'Bronze I',
  'Silver III',
  'Silver II',
  'Silver I',
  'Gold III',
  'Gold II',
  'Gold I',
  'Emerald III',
  'Emerald II',
  'Emerald I',
  'Platinum III',
  'Platinum II',
  'Platinum I',
  'Diamond III',
  'Diamond II',
  'Diamond I',
  'Master III',
  'Master II',
  'Master I',
  'Grandmaster III',
  'Grandmaster II',
  'Grandmaster I',
  'Elite Grandmaster',
] as const;

// Create a type from the valid tiers array
type TierName = (typeof validTiers)[number];

export default function TierIcon({
  tier,
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  tier: TierName;
}) {
  // We still use validTiers at runtime to ensure the tier is valid
  // This prevents the ESLint error about validTiers only being used as a type
  if (!validTiers.includes(tier)) {
    console.warn(`Invalid tier: ${tier}`);
  }

  return (
    <SimpleTooltip content={tier}>
      <Image src={`/icons/tiers/${tier}.svg`} alt={tier} {...rest} />
    </SimpleTooltip>
  );
}
