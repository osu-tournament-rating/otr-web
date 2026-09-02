import { RatingAdjustmentType } from '@otr/core/osu';
import type { APIEmbed } from 'discord.js';

import type { PlayerBeatmapsResponse } from '@/lib/orpc/schema/playerBeatmaps';
import type { PlayerStats } from '@/lib/orpc/schema/playerStats';
import type { PlayerTournamentListItem } from '@/lib/orpc/schema/tournament';
import { getTierString, type TierName } from '@/lib/utils/tierData';

import { renderPng } from '../chart/png';
import { ratingHistory } from '../chart/svg';
import type { Reply, ViewContext } from '../command';
import type { CustomId } from '../custom-id';
import { linkButton, pager, tabs } from './buttons';
import {
  bar,
  countryName,
  flag,
  inProgress,
  link,
  lobby,
  num,
  paginate,
  pct,
  plural,
  rulesetName,
  signed,
  tier,
  when,
} from './format';
import { tierIcon } from './icons';
import { grey, hex, tierColor } from './theme';

type View = 'po' | 'pt' | 'pb';

const shell = (stats: PlayerStats, ctx: ViewContext) => {
  const { playerInfo: player, rating } = stats;
  const files: NonNullable<Reply['files']> = [];
  const ruleset = rulesetName(stats.ruleset);
  const embed: APIEmbed = {
    color: rating ? tierColor(rating.tierProgress.currentTier) : grey,
    author: { name: ruleset },
    title: player.username,
    url: `${ctx.siteUrl}/players/${player.id}`,
    thumbnail: { url: `https://a.ppy.sh/${player.osuId}` },
  };

  if (rating) {
    files.push({
      name: 'tier.png',
      data: tierIcon(
        rating.tierProgress.currentTier,
        rating.tierProgress.currentSubTier
      ),
    });
    embed.author = {
      name: `${ruleset} · ${tier(rating.tierProgress)}`,
      icon_url: 'attachment://tier.png',
    };
  }

  return { embed, files, ruleset };
};

const nav = (
  stats: PlayerStats,
  active: View,
  ctx: ViewContext,
  page: number
) =>
  tabs(
    String(stats.playerInfo.id),
    stats.ruleset,
    active,
    page,
    [
      ['Overview', 'po'],
      ['Tournaments', 'pt'],
      ['Pooled maps', 'pb'],
    ],
    linkButton('Open on o!TR', `${ctx.siteUrl}/players/${stats.playerInfo.id}`)
  );

const chartPoints = (stats: PlayerStats) =>
  (stats.rating?.adjustments ?? [])
    .filter((a) => a.adjustmentType !== RatingAdjustmentType.VolatilityDecay)
    .map((a) => ({ time: Date.parse(a.timestamp), rating: a.ratingAfter }));

export function playerCard(stats: PlayerStats, ctx: ViewContext): Reply {
  const { embed, files, ruleset } = shell(stats, ctx);
  const { playerInfo: player, rating, matchStats } = stats;
  const components = [nav(stats, 'po', ctx, 1)];

  if (!rating) {
    return {
      embeds: [
        {
          ...embed,
          description: `No rating in ${ruleset} yet. Ratings are separate per ruleset.`,
          footer: { text: `o!TR · ${ruleset}` },
        },
      ],
      components,
      files,
    };
  }

  const progress = rating.tierProgress;
  const lastMatch = rating.adjustments.findLast(
    (a) => a.adjustmentType === RatingAdjustmentType.Match
  );
  const target = progress.nextTier
    ? getTierString(
        progress.nextTier as TierName,
        progress.nextSubTier ?? undefined
      )
    : null;
  const fill =
    progress.nextSubTier === null
      ? progress.majorTierFillPercentage
      : progress.subTierFillPercentage;
  const standing =
    rating.globalRank === 1
      ? '#1'
      : `top ${Math.max(0.1, 100 - rating.percentile).toFixed(1)}%`;
  const lines = [
    `**${num(rating.rating)} TR** · ${standing} · ${flag(player.country)} ${countryName(player.country)}`,
    `\`${bar(target ? (fill ?? 0) : 1)}\` ${target ? `${num(progress.ratingForNextTier - rating.rating)} TR to ${target}` : 'Top tier'}`,
    [
      lastMatch ? `Last match ${when(lastMatch.timestamp, 'R')}` : null,
      rating.isProvisional
        ? `Provisional (${rating.adjustments.length} of 10 adjustments)`
        : null,
    ]
      .filter(Boolean)
      .join(' · '),
  ].filter(Boolean);

  const fields: NonNullable<APIEmbed['fields']> = [
    {
      name: 'Rank',
      value: `#${num(rating.globalRank)} global\n#${num(rating.countryRank)} ${player.country.toUpperCase()}`,
      inline: true,
    },
    {
      name: 'Record',
      value: matchStats
        ? `${num(rating.tournamentsPlayed)} ${plural(rating.tournamentsPlayed, 'tournament')}\n${num(rating.matchesPlayed)} ${plural(rating.matchesPlayed, 'match', 'matches')} · ${pct(matchStats.matchWinRate)} won`
        : inProgress,
      inline: true,
    },
    {
      name: 'Peak',
      value: matchStats
        ? `${num(matchStats.highestRating ?? rating.rating)} TR\n${signed(matchStats.ratingGained)} lifetime`
        : inProgress,
      inline: true,
    },
  ];
  const company = (name: string, list: PlayerStats['frequentTeammates']) =>
    list.length > 0
      ? [
          {
            name,
            value: list
              .slice(0, 3)
              .map((f) => `${f.player.username} ${f.frequency}`)
              .join(' · '),
            inline: true,
          },
        ]
      : [];
  fields.push(
    ...company('Often with', stats.frequentTeammates),
    ...company('Often against', stats.frequentOpponents)
  );

  const chart = ratingHistory(chartPoints(stats), {
    color: hex(embed.color ?? grey),
    peak: matchStats?.highestRating,
  });
  if (chart) {
    files.push({ name: 'rating.png', data: renderPng(chart) });
  }

  return {
    embeds: [
      {
        ...embed,
        description: lines.join('\n'),
        fields,
        ...(chart ? { image: { url: 'attachment://rating.png' } } : {}),
        footer: {
          text: `o!TR · ${ruleset} · TR estimates relative tournament performance, not skill`,
        },
      },
    ],
    components,
    files,
  };
}

export function playerTournaments(
  stats: PlayerStats,
  tournaments: PlayerTournamentListItem[],
  id: CustomId,
  ctx: ViewContext
): Reply {
  const { embed, files, ruleset } = shell(stats, ctx);
  const { pages, page, items } = paginate(tournaments, id.page, 5);
  const description =
    items.length > 0
      ? items
          .map(
            (t) =>
              `${link(t.abbreviation, `${ctx.siteUrl}/tournaments/${t.id}`)} ${t.name} · ${lobby(t.lobbySize)} · ${t.matchesWon}–${t.matchesLost}${t.endTime ? ` · ${when(t.endTime, 'D')}` : ''}`
          )
          .join('\n')
      : `No tournaments in ${ruleset} yet.`;

  return {
    embeds: [
      {
        ...embed,
        description,
        footer: {
          text: `o!TR · ${ruleset} · ${num(tournaments.length)} ${plural(tournaments.length, 'tournament')} · page ${page} of ${pages}`,
        },
      },
    ],
    components: [nav(stats, 'pt', ctx, page), ...pager({ ...id, page }, pages)],
    files,
  };
}

export function playerBeatmaps(
  stats: PlayerStats,
  response: PlayerBeatmapsResponse,
  id: CustomId,
  ctx: ViewContext
): Reply {
  const { embed, files, ruleset } = shell(stats, ctx);
  const pages = Math.max(1, Math.ceil(response.totalCount / 5));
  const page = Math.min(id.page, pages);
  const description =
    response.beatmaps.length > 0
      ? response.beatmaps
          .map(
            (b) =>
              `★${b.sr.toFixed(2)} · ${Math.round(b.bpm)} BPM · ${link(`${b.artist} - ${b.title} [${b.diffName}]`, `${ctx.siteUrl}/beatmaps/${b.osuId}`)} · ${num(b.tournamentCount)} ${plural(b.tournamentCount, 'pool')}`
          )
          .join('\n')
      : `No pooled maps by ${stats.playerInfo.username} yet.`;

  return {
    embeds: [
      {
        ...embed,
        description,
        footer: {
          text: `o!TR · ${ruleset} · ${num(response.totalCount)} pooled ${plural(response.totalCount, 'map')} · page ${page} of ${pages}`,
        },
      },
    ],
    components: [nav(stats, 'pb', ctx, page), ...pager({ ...id, page }, pages)],
    files,
  };
}
