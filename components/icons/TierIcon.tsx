import Image from 'next/image';
import SimpleTooltip from '../simple-tooltip';

export default function TierIcon({
  tier,
  width,
  height,
}: {
  tier: string;
  width: number;
  height: number;
}) {
  return (
    <SimpleTooltip content={tier}>
      <Image
        src={`/icons/tiers/${tier}.svg`}
        alt={tier}
        width={width}
        height={height}
      />
    </SimpleTooltip>
  );
}
