import type { Ruleset } from '@otr/core/osu';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { IconButton } from '@/components/kit/controls/IconButton';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import CountryFlag from '@/components/shared/CountryFlag';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { PlayerCompact } from '@/lib/orpc/schema/playerStats';

import PlayerRulesetSwitch from './PlayerRulesetSwitch';

// Rendered on the server only, so the browser's own data never comes into it.
const REGION_NAMES = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
});

/** "Australia" for `AU`; the code itself when the name is unknown. */
function getCountryName(code: string): string {
  try {
    return REGION_NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The top of a player's profile: avatar, name, country (a link to that
 * country's leaderboard), the osu! profile link, and the ruleset the page
 * shows.
 */
export default function PlayerHero({
  player,
  ruleset,
}: {
  player: PlayerCompact;
  ruleset: Ruleset;
}) {
  const countryName = getCountryName(player.country);

  return (
    <DetailHero
      data-testid="player-card"
      leading={
        <OsuAvatar
          data-testid="player-avatar"
          osuId={player.osuId}
          username={player.username}
          size={64}
          className="bg-accent"
        />
      }
      title={<span data-testid="player-username">{player.username}</span>}
      meta={
        player.country ? (
          <Link
            href={`/leaderboard?country=${encodeURIComponent(player.country)}&ruleset=${ruleset}`}
            aria-label={`${countryName} leaderboard`}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-sm transition-colors outline-none hover:text-link focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span aria-hidden className="flex shrink-0">
              <CountryFlag country={player.country} showTooltip={false} />
            </span>
            <span className="min-w-0 break-words">{countryName}</span>
          </Link>
        ) : null
      }
      actions={
        <IconButton
          asChild
          variant="outline"
          icon={ExternalLink}
          label="View profile on osu! website"
        >
          <a
            href={`https://osu.ppy.sh/u/${player.osuId}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        </IconButton>
      }
    >
      <div className="px-4 py-3 sm:px-6">
        <PlayerRulesetSwitch ruleset={ruleset} />
      </div>
    </DetailHero>
  );
}
