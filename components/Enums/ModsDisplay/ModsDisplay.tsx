import { ModsEnumHelper } from '@/lib/enums';
import ModFM from '@/public/icons/mods/ModFM.svg?url';
import { Mods } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';

export default function ModsDisplay({
  containerClass,
  modClass,
  mods,
  isFreeMod,
  reverse = false,
}: {
  containerClass: string;
  modClass: string;
  mods: Mods;
  isFreeMod: boolean;
  reverse: boolean;
}) {
  const metadata = ModsEnumHelper.getMetadata(mods);

  return (
    <div className={containerClass}>
      {metadata.map(({ text }, index) => (
        <div
          className={modClass}
          key={text}
          style={{
            zIndex: reverse ? metadata.length + 1 - (index + 1) : index + 1,
          }}
        >
          <Image src={`/icons/mods/Mod${text}.svg`} alt={`mod-${text}`} fill />
        </div>
      ))}
      {isFreeMod && (
        <div className={modClass} key={'FM'}>
          <Image src={ModFM} alt={'mod-freemod'} fill />
        </div>
      )}
    </div>
  );
}
