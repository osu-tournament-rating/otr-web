import { ModsEnumHelper } from '@/lib/enum-helpers';
import { Mods } from '@otr/core/osu';
import type { LazerMod } from '@otr/core/osu/lazer-mods';
import { formatNumber } from '@/lib/kit/format/number';
import { getLazerModSpeed } from '@/lib/kit/format/mods';
import { cn } from '@/lib/utils';
import Image from 'next/image';

/** The acronyms with artwork in `public/icons/mods`. */
const MOD_ICONS = new Set([
  '1K',
  '2K',
  '3K',
  '4K',
  '5K',
  '6K',
  '7K',
  '8K',
  '9K',
  'AP',
  'AT',
  'DT',
  'EZ',
  'FL',
  'FM',
  'HD',
  'HR',
  'HT',
  'MR',
  'NC',
  'NF',
  'NM',
  'RD',
  'RX',
  'SD',
  'SO',
  'TD',
]);

interface ModEntry {
  acronym: string;
  /** A custom rate, such as 1.2 for DT at 1.2x. */
  speed: number | null;
}

/**
 * The mods to draw. A lazer list, when there is one, is drawn instead of the
 * bitflags, since it holds the lazer-only mods and settings the flags cannot.
 */
function resolveEntries(
  mods: Mods,
  lazerMods: readonly LazerMod[] | null | undefined
): ModEntry[] {
  if (lazerMods) {
    return lazerMods
      .filter((mod) => mod.acronym !== 'NF')
      .map((mod) => ({ acronym: mod.acronym, speed: getLazerModSpeed(mod) }));
  }

  // Clear NF
  return ModsEnumHelper.getMetadata(mods & ~Mods.NoFail)
    .map(({ text }) => text)
    .filter(Boolean)
    .map((acronym) => ({ acronym, speed: null }));
}

const formatSpeed = (speed: number) =>
  `${formatNumber(speed, { maxDecimals: 2 })}x`;

export default function ModIconset({
  mods,
  lazerMods,
  className,
  iconClassName,
  freemod = false,
  alwaysExpanded = false,
}: {
  mods: Mods;
  lazerMods?: readonly LazerMod[] | null;
  className?: string;
  iconClassName?: string;
  freemod?: boolean;
  alwaysExpanded?: boolean;
}) {
  let entries = resolveEntries(mods, lazerMods);
  if (entries.length === 0 && !freemod) {
    entries = [{ acronym: 'NM', speed: null }];
  }
  if (freemod) {
    entries = [{ acronym: 'FM', speed: null }, ...entries];
  }
  const icons = entries.filter((mod) => MOD_ICONS.has(mod.acronym));
  // Only one rate mod plays at a time, so its speed follows the icon stack.
  const iconSpeed = icons.find((mod) => mod.speed !== null)?.speed ?? null;
  // Lazer-only mods have no artwork yet, so they read as text.
  const labels = entries.filter((mod) => !MOD_ICONS.has(mod.acronym));

  return (
    <div className={className}>
      {icons.map(({ acronym }, idx) => (
        <div
          key={acronym}
          className={cn(
            'peer relative aspect-[60/45] h-full max-h-12 transition-[margin] duration-200 ease-in-out',
            alwaysExpanded
              ? 'not-first:-ml-2'
              : 'not-first:-ml-4 peer-hover:not-first:-ml-2 hover:not-first:-ml-2',
            iconClassName
          )}
          style={{ zIndex: icons.length - idx }}
        >
          <Image
            src={`/icons/mods/Mod${acronym}.svg`}
            alt={`mod-${acronym}`}
            fill
          />
        </div>
      ))}
      {iconSpeed !== null && (
        <span className="ml-1 shrink-0 text-xs font-semibold tabular-nums">
          {formatSpeed(iconSpeed)}
        </span>
      )}
      {labels.map(({ acronym, speed }) => (
        <span
          key={acronym}
          className="ml-1 shrink-0 rounded-md border border-border bg-muted px-1 text-xs font-semibold text-foreground"
        >
          {speed === null ? acronym : `${acronym} ${formatSpeed(speed)}`}
        </span>
      ))}
    </div>
  );
}
