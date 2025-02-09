import { ModsEnumHelper } from '@/lib/enums';
import { Mods } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';

export default function ModsDisplay({
  containerClass,
  modClass,
  mods,
  isFreeMod = false,
  reverse = false,
}: {
  containerClass: string;
  modClass: string;
  mods: Mods;
  isFreeMod?: boolean;
  reverse?: boolean;
}) {
  let metadata = ModsEnumHelper.getMetadata(mods).map(({ text }) => text);

  if (mods === Mods.NoFail || (mods === Mods.None && !isFreeMod)) {
    metadata = ['NM'];
  }

  if (isFreeMod) {
    metadata.unshift('FM');
  }

  return (
    <div className={containerClass}>
      {metadata.map((text, index) => (
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
    </div>
  );
}
