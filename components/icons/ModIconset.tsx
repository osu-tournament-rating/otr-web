import { ModsEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { Mods } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';

export default function ModIconset({
  mods,
  className,
  freemod = false,
}: {
  mods: Mods;
  className?: string;
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
    <>
      {metadata.map((mod, idx) => (
        <div
          key={mod}
          className={cn(
            `relative aspect-[60/45] h-full max-h-12 transition-[margin-left] duration-200 ease-in-out not-first:-ml-8 hover:not-first:-ml-4`,
            className
          )}
          style={{ zIndex: idx }}
        >
          <Image src={`/icons/mods/Mod${mod}.svg`} alt={`mod-${mod}`} fill />
        </div>
      ))}
    </>
  );
}
