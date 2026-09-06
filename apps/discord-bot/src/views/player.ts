import { RatingAdjustmentType } from '@otr/core/osu';
import type { APIEmbed } from 'discord.js';

import type { PlayerBeatmapsResponse } from '@/lib/orpc/schema/playerBeatmaps';
import type { PlayerStats } from '@/lib/orpc/schema/playerStats';
import { getTierFromRating } from '@/lib/utils/tierData';
import type { PlayerTournamentListItem } from '@/lib/orpc/schema/tournament';

import { renderPng } from '../chart/png';
import { ratingHistory } from '../chart/svg';
import type { Reply, ViewContext } from '../command';
import type { CustomId } from '../custom-id';
import { tierEmojiName } from '../emojis';
import { button, row, linkButton, pager, tabs } from './buttons';
import {
  wrapList,
  ago,
  date,
  flag,
  hourWindow,
  inProgress,
  link,
  lobby,
  playerModList,
  starRating,
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

const joined = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(' ');

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

type Sections = { name: string; value: string }[];

const company = (
  name: string,
  list: PlayerStats['frequentTeammates']
): Sections => [
  {
    name,
    value:
      list.length > 0
        ? wrapList(
            list
              .slice(0, 5)
              .map((f) => `${f.player.username} (**${num(f.frequency)}**)`)
          )
        : '—',
  },
];

const RECENT_MATCH_COUNT = 3;

const recentMatchSection = (
  adjustments: Adjustments,
  tournaments: PlayerTournamentListItem[],
  ctx: ViewContext
): Sections => {
  const seen = new Set<number>();
  const recent = [...matchAdjustments(adjustments)]
    .sort((a, b) => time(b.timestamp) - time(a.timestamp))
    .filter((match) => {
      if (match.matchId === null || seen.has(match.matchId)) return false;
      seen.add(match.matchId);
      return true;
    })
    .slice(0, RECENT_MATCH_COUNT);
  if (!recent.length) return [];

  return [
    {
      name: '🕒 Recent matches',
      value: recent
        .map((match) => {
          const score =
            match.gamesWon !== null && match.gamesLost !== null
              ? `${match.gamesWon}–${match.gamesLost}`
              : null;
          const outcome =
            match.matchWon === null ? null : match.matchWon ? 'Won' : 'Lost';
          const result = link(
            joined(outcome, score) || 'Match',
            `${ctx.siteUrl}/matches/${match.matchId}`
          );
          const tournament = tournaments.find(
            (t) => t.id === match.match?.tournamentId
          );
          const heading = `**${result}** · **${signed(match.ratingDelta)} TR** · ${ago(match.timestamp)}`;
          return tournament
            ? `${heading}\n↳ ${link(tournament.name, `${ctx.siteUrl}/tournaments/${tournament.id}`)}`
            : heading;
        })
        .join('\n'),
    },
  ];
};

export function playerCard(
  stats: PlayerStats,
  tournaments: PlayerTournamentListItem[],
  ctx: ViewContext,
  view: 'summary' | 'details' = 'summary'
): Reply {
  const { embed, files, ruleset } = shell(stats, ctx);
  const { playerInfo: player, rating, matchStats } = stats;

  if (!rating) {
    return {
      embeds: [
        {
          ...embed,
          description: `No rating in ${ruleset} yet. Ratings are separate per ruleset.`,
          footer: { text: `o!TR · ${ruleset}` },
        },
      ],
      files,
    };
  }

  const progress = rating.tierProgress;
  const home = flag(player.country);
  const description = [
    `${joined(ctx.emoji(tierEmojiName(progress.currentTier, progress.currentSubTier)), `**${tier(progress)}**`)} · **${num(rating.rating)} TR**`,
    `🌐 **#${num(rating.globalRank)}** (#${num(rating.countryRank)}${home ? ` ${home}` : ''})`,
  ].join('\n');

  const matches = matchAdjustments(rating.adjustments);
  const window = hourWindow(
    matches.map((a) => new Date(a.timestamp).getUTCHours())
  );
  const mods = playerModList(stats.modPerformance ?? []);
  const [latest] = byNewest(tournaments);

  const peak = matchStats?.highestRating ?? rating.rating;
  const peakTier = getTierFromRating(peak);
  const peakLabel = joined(
    `**${num(peak)} TR**`,
    ctx.emoji(tierEmojiName(peakTier.tier, peakTier.subTier ?? null))
  );
  const sections: Sections =
    view === 'details'
      ? [
          {
            name: '🕑 Match times',
            value: wrapList([
              window
                ? `**${window.start}–${window.end} UTC** (${pct(window.share)})`
                : '—',
              `**${num(rating.matchesPlayed)}** ${plural(rating.matchesPlayed, 'match', 'matches')}`,
            ]),
          },
          ...company('🤝 Often with', stats.frequentTeammates),
          ...company('🎯 Often against', stats.frequentOpponents),
        ]
      : [
          {
            name: '⚔️ Record',
            value: matchStats
              ? [
                  `↳ **${num(matchStats.matchesWon)}–${num(matchStats.matchesLost)}** · ${pct(matchStats.matchWinRate)} won`,
                  `↳ **${num(rating.tournamentsPlayed)}** ${plural(rating.tournamentsPlayed, 'tournament')}`,
                  `↳ peak ${peakLabel}`,
                ].join('\n')
              : inProgress,
          },
          ...(mods.length > 0
            ? [
                {
                  name: '🎲 Mods',
                  value: mods,
                },
              ]
            : []),
          ...recentMatchSection(rating.adjustments, tournaments, ctx),
          ...(latest
            ? [
                {
                  name: '🏆 Last tournament',
                  value: wrapList([
                    ...tournamentLine(latest, rating.adjustments).split(' · '),
                    tournamentLink(latest, ctx),
                  ]),
                },
              ]
            : []),
        ];

  const chart =
    view === 'details'
      ? null
      : ratingHistory(chartPoints(stats), {
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
        description: [
          description,
          ...sections.map(({ name, value }) => `**${name}**\n${value}`),
        ].join('\n\n'),
        ...(chart ? { image: { url: 'attachment://rating.png' } } : {}),
        footer: { text: `o!TR · ${ruleset}` },
      },
    ],
    components: [
      row(
        button(view === 'details' ? 'Back' : 'More details', {
          view: view === 'details' ? 'po' : 'pd',
          key: String(player.id),
          ruleset: stats.ruleset,
          page: 1,
        })
      ),
    ],
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
  const { embed, files, ruleset } = shell(stats, ctx);
  const pages = Math.max(1, Math.ceil(response.totalCount / 5));
  const page = Math.min(id.page, pages);
  const description =
    response.beatmaps.length > 0
      ? response.beatmaps
          .map(
            (b) =>
              `${starRating(b.sr)} · ${Math.round(b.bpm)} BPM · ${link(`${b.artist} - ${b.title} [${b.diffName}]`, `${ctx.siteUrl}/beatmaps/${b.osuId}`)} · ${num(b.tournamentCount)} ${plural(b.tournamentCount, 'pool')}`
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
