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

/**
 * The acronyms to draw, and the custom speed of a rate mod. A lazer list,
 * when there is one, is drawn instead of the bitflags, since it holds the
 * lazer-only mods and settings the flags cannot.
 */
function resolveIcons(
  mods: Mods,
  lazerMods: readonly LazerMod[] | null | undefined
): { acronyms: string[]; speed: number | null } {
  if (lazerMods) {
    const shown = lazerMods.filter((mod) => mod.acronym !== 'NF');
    const speed =
      shown.map(getLazerModSpeed).find((value) => value !== null) ?? null;
    return { acronyms: shown.map((mod) => mod.acronym), speed };
  }

  // Clear NF
  return {
    acronyms: ModsEnumHelper.getMetadata(mods & ~Mods.NoFail)
      .map(({ text }) => text)
      .filter(Boolean),
    speed: null,
  };
}

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
  let { acronyms, speed } = resolveIcons(mods, lazerMods);
  if (acronyms.length === 0 && !freemod) {
    acronyms = ['NM'];
  }
  if (freemod) {
    acronyms = ['FM', ...acronyms];
    speed = null;
  }
  const icons = acronyms.filter((mod) => MOD_ICONS.has(mod));
  // Lazer-only mods have no artwork yet, so they read as text.
  const labels = acronyms.filter((mod) => !MOD_ICONS.has(mod));

  return (
    <div className={className}>
      {icons.map((mod, idx) => (
        <div
          key={mod}
          className={cn(
            'peer relative aspect-[60/45] h-full max-h-12 transition-[margin] duration-200 ease-in-out',
            alwaysExpanded
              ? 'not-first:-ml-2'
              : 'not-first:-ml-4 peer-hover:not-first:-ml-2 hover:not-first:-ml-2',
            iconClassName
          )}
          style={{ zIndex: icons.length - idx }}
        >
          <Image src={`/icons/mods/Mod${mod}.svg`} alt={`mod-${mod}`} fill />
        </div>
      ))}
      {labels.map((mod) => (
        <span
          key={mod}
          className="ml-1 shrink-0 rounded-md border border-border bg-muted px-1 text-xs font-semibold text-foreground"
        >
          {mod}
        </span>
      ))}
      {speed !== null && (
        <span className="ml-1 shrink-0 text-xs font-semibold tabular-nums">
          {formatNumber(speed, { maxDecimals: 2 })}x
        </span>
      )}
    </div>
  );
}
