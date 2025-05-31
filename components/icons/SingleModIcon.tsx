import { ModsEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { Mods } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';

export default function SingleModIcon({
  mods,
  className,
  size = 16,
}: {
  mods: Mods;
  className?: string;
  size?: number;
}) {
  // Clear NF
  mods &= ~Mods.NoFail;
  const metadata = ModsEnumHelper.getMetadata(mods);

  // Get the mod text - for single mods, just take the first one
  let modText = 'NM'; // Default to No Mod
  if (metadata.length > 0 && metadata[0]?.text) {
    modText = metadata[0].text;
  } else if (mods === Mods.None) {
    modText = 'NM';
  }

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/icons/mods/Mod${modText}.svg`}
        alt={`mod-${modText}`}
        fill
        className="object-contain"
      />
    </div>
  );
}
