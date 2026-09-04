import { RatingAdjustmentType } from '@otr/core/osu';
import type { APIEmbed } from 'discord.js';

import type { PlayerBeatmapsResponse } from '@/lib/orpc/schema/playerBeatmaps';
import type { PlayerStats } from '@/lib/orpc/schema/playerStats';
import type { PlayerTournamentListItem } from '@/lib/orpc/schema/tournament';
import { getBeatmapModLabel } from '@/lib/utils/mods';
import { getTierString, type TierName } from '@/lib/utils/tierData';

import { renderPng } from '../chart/png';
import { ratingHistory } from '../chart/svg';
import type { Reply, ViewContext } from '../command';
import type { CustomId } from '../custom-id';
import { tierEmojiName } from '../emojis';
import { linkButton, pager, tabs } from './buttons';
import {
  ago,
  bar,
  date,
  flag,
  histogram,
  hourWindow,
  inProgress,
  link,
  lobby,
  num,
  paginate,
  pct,
  plural,
  rankRange,
  rulesetName,
  signed,
  time,
  tier,
  tournamentDelta,
} from './format';
import { grey, hex, tierColor } from './theme';

type View = 'po' | 'pt' | 'pb';
type Adjustments = NonNullable<PlayerStats['rating']>['adjustments'];

const spacer = () => ({ name: '​', value: '​', inline: true });

const joined = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(' ');

const shell = (stats: PlayerStats) => {
  const { playerInfo: player, rating } = stats;
  const files: NonNullable<Reply['files']> = [];
  const ruleset = rulesetName(stats.ruleset);
  const embed: APIEmbed = {
    color: rating ? tierColor(rating.tierProgress.currentTier) : grey,
    author: { name: `${player.username} · ${ruleset}` },
    thumbnail: { url: `https://a.ppy.sh/${player.osuId}` },
  };

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

const matchAdjustments = (adjustments: Adjustments) =>
  adjustments.filter((a) => a.adjustmentType === RatingAdjustmentType.Match);

const byNewest = (tournaments: PlayerTournamentListItem[]) =>
  [...tournaments].sort((a, b) => time(b.endTime) - time(a.endTime));

/** `[Name](url) (ABBR)`; the abbreviation only when it differs from the name. */
const tournamentLink = (t: PlayerTournamentListItem, ctx: ViewContext) => {
  const name = link(t.name, `${ctx.siteUrl}/tournaments/${t.id}`);
  const abbreviation = t.abbreviation.trim();
  return abbreviation &&
    abbreviation.toLowerCase() !== t.name.trim().toLowerCase()
    ? `${name} (${abbreviation})`
    : name;
};

const tournamentLine = (
  t: PlayerTournamentListItem,
  adjustments: Adjustments
) =>
  [
    `**${num(t.matchesWon)}–${num(t.matchesLost)}**`,
    `**${signed(tournamentDelta(adjustments, t.id))} TR**`,
    lobby(t.lobbySize),
    rankRange(t.rankRangeLowerBound),
    t.endTime ? date(t.endTime) : null,
  ]
    .filter(Boolean)
    .join(' · ');

const modRows = (modStats: PlayerStats['modStats']) => {
  const counts = new Map<string, number>();
  let total = 0;
  for (const entry of modStats) {
    if (entry.count <= 0) {
      continue;
    }
    const label = getBeatmapModLabel(entry.mods);
    counts.set(label, (counts.get(label) ?? 0) + entry.count);
    total += entry.count;
  }

  return [...counts]
    .map(([label, count]) => ({ label, count, share: count / total }))
    .filter((row) => row.share >= 0.01)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

type Fields = NonNullable<APIEmbed['fields']>;

const company = (
  name: string,
  list: PlayerStats['frequentTeammates']
): Fields => [
  {
    name,
    value:
      list.length > 0
        ? list
            .slice(0, 5)
            .map((f) => `**${num(f.frequency)}** - ${f.player.username}`)
            .join('\n')
        : '—',
    inline: true,
  },
];

const lastMatchField = (
  adjustments: Adjustments,
  tournaments: PlayerTournamentListItem[],
  ctx: ViewContext
): Fields => {
  const last = matchAdjustments(adjustments).at(-1);
  if (!last) {
    return [];
  }

  const score =
    last.gamesWon !== null && last.gamesLost !== null
      ? `${last.gamesWon}–${last.gamesLost}`
      : null;
  const outcome =
    last.matchWon === null ? null : last.matchWon ? 'Won' : 'Lost';
  const label = joined(outcome, score) || 'Match';
  const result = last.matchId
    ? link(label, `${ctx.siteUrl}/matches/${last.matchId}`)
    : label;
  const t = tournaments.find((item) => item.id === last.match?.tournamentId);

  return [
    {
      name: '🕒 Last match',
      value: [
        `**${result}**`,
        `**${signed(last.ratingDelta)} TR**`,
        ago(last.timestamp),
        t ? tournamentLink(t, ctx) : null,
      ]
        .filter(Boolean)
        .join(' · '),
      inline: false,
    },
  ];
};

export function playerCard(
  stats: PlayerStats,
  tournaments: PlayerTournamentListItem[],
  ctx: ViewContext
): Reply {
  const { embed, files, ruleset } = shell(stats);
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
  // A jump into a new major tier lands on its lowest subtier.
  const target = progress.nextTier
    ? getTierString(progress.nextTier as TierName, progress.nextSubTier ?? 3)
    : null;
  const fill =
    progress.nextSubTier === null
      ? progress.majorTierFillPercentage
      : progress.subTierFillPercentage;
  const road =
    progress.nextTier && target
      ? joined(
          `**${num(progress.ratingForNextTier - rating.rating)} TR** to`,
          `\`${bar(fill ?? 0, 5)}\``,
          ctx.emoji(tierEmojiName(progress.nextTier, progress.nextSubTier)),
          target
        )
      : `\`${bar(1, 5)}\` Top tier`;
  const home = flag(player.country);
  const description = [
    `${joined(ctx.emoji(tierEmojiName(progress.currentTier, progress.currentSubTier)), `**${tier(progress)}**`)} · **${num(rating.rating)} TR**`,
    `**#${num(rating.globalRank)}** (#${num(rating.countryRank)}${home ? ` ${home}` : ''})`,
    road,
  ].join('\n');

  const matches = matchAdjustments(rating.adjustments);
  const window = hourWindow(
    matches.map((a) => new Date(a.timestamp).getUTCHours())
  );
  const mods = modRows(stats.modStats);
  const [latest] = byNewest(tournaments);

  const fields: Fields = [
    {
      name: '⚔️ Record',
      value: matchStats
        ? `**${num(matchStats.matchesWon)}–${num(matchStats.matchesLost)}** · ${pct(matchStats.matchWinRate)} won\n**${num(rating.tournamentsPlayed)}** ${plural(rating.tournamentsPlayed, 'tournament')} · peak **${num(matchStats.highestRating ?? rating.rating)} TR**`
        : inProgress,
      inline: true,
    },
    {
      name: '🕑 Match times',
      value: `${window ? `**${window.start}–${window.end} UTC** (${pct(window.share)})` : '—'}\n**${num(rating.matchesPlayed)}** ${plural(rating.matchesPlayed, 'match', 'matches')}`,
      inline: true,
    },
    spacer(),
    ...company('🤝 Often with', stats.frequentTeammates),
    ...company('🎯 Often against', stats.frequentOpponents),
    spacer(),
    ...(mods.length > 0
      ? [{ name: '🎲 Mods', value: histogram(mods), inline: false }]
      : []),
    ...lastMatchField(rating.adjustments, tournaments, ctx),
    ...(latest
      ? [
          {
            name: '🏆 Last tournament',
            value: `${tournamentLine(latest, rating.adjustments)} · ${tournamentLink(latest, ctx)}`,
            inline: false,
          },
        ]
      : []),
  ];

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
        description,
        fields,
        ...(chart ? { image: { url: 'attachment://rating.png' } } : {}),
        footer: { text: `o!TR · ${ruleset}` },
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
  const { embed, files, ruleset } = shell(stats);
  const { pages, page, items } = paginate(byNewest(tournaments), id.page, 5);
  const { matchStats } = stats;
  const adjustments = stats.rating?.adjustments ?? [];
  const header = [
    `🏆 **${num(tournaments.length)}** ${plural(tournaments.length, 'tournament')}`,
    matchStats
      ? `**${num(matchStats.matchesWon)}–${num(matchStats.matchesLost)}** ${plural(matchStats.matchesPlayed, 'match', 'matches')}`
      : null,
    matchStats ? `**${pct(matchStats.matchWinRate)}** won` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const rows = items.map(
    (t) => `❖ ${tournamentLink(t, ctx)}\n${tournamentLine(t, adjustments)}`
  );
  const description =
    items.length > 0
      ? [header, ...rows].join('\n\n')
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
  const { embed, files, ruleset } = shell(stats);
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
