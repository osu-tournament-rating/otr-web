import Image from 'next/image';
import SimpleTooltip from '../simple-tooltip';
export default function TierIcon({
  tier,
  ...rest
}: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> & {
  tier: string;
}) {
  return (
    <SimpleTooltip content={tier}>
      <Image src={`/icons/tiers/${tier}.svg`} alt={tier} {...rest} />
    </SimpleTooltip>
  );
}
