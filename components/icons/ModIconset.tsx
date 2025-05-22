import { ModsEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { Mods } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';

export default function ModIconset({
  mods,
  className,
  iconClassName,
  freemod = false,
}: {
  mods: Mods;
  className?: string;
  iconClassName?: string;
  freemod?: boolean;
}) {
  // Clear NF
  mods &= ~Mods.NoFail;
  let metadata = ModsEnumHelper.getMetadata(mods).map(({ text }) => text);
  if (mods === Mods.None && !freemod) {
    metadata = ['NM'];
  }
  if (freemod) {
    metadata.unshift('FM');
  }
  return (
    <div className={className}>
      {metadata.map((mod, idx) => (
        <div
          key={mod}
          className={cn(
            `not-first:-ml-4 peer-hover:not-first:-ml-2 hover:not-first:-ml-2 peer relative aspect-[60/45] h-full max-h-12 transition-[margin] duration-200 ease-in-out`,
            iconClassName
          )}
          style={{ zIndex: idx }}
        >
          <Image src={`/icons/mods/Mod${mod}.svg`} alt={`mod-${mod}`} fill />
        </div>
      ))}
    </div>
  );
}
