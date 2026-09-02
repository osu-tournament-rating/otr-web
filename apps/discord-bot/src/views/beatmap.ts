import { VerificationStatus } from '@otr/core/osu';
import type { APIEmbed } from 'discord.js';

import type { BeatmapStatsResponse } from '@/lib/orpc/schema/beatmapStats';
import {
  calculateBeatmapModDistribution,
  filterBeatmapModDistribution,
} from '@/lib/utils/mods';

import { renderPng } from '../chart/png';
import { percentileCurve } from '../chart/svg';
import type { Reply, ViewContext } from '../command';
import type { CustomId } from '../custom-id';
import { button, linkButton, pager, row } from './buttons';
import {
  bar,
  clip,
  duration,
  link,
  lobby,
  mods,
  num,
  paginate,
  pct,
  rankRange,
  rulesetName,
  setting,
  statusName,
  table,
  when,
} from './format';
import { grey, hex, primary } from './theme';

type View = 'bo' | 'bs' | 'bt';

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);

const shell = (stats: BeatmapStatsResponse, ctx: ViewContext) => {
  const { beatmap: b, summary } = stats;
  const set = b.beatmapset;
  const artist = b.artistOverride ?? set?.artist ?? 'Unknown artist';
  const title = b.titleOverride ?? set?.title ?? 'Unknown title';
  const mapper =
    b.creators.map((c) => c.username).join(', ') ||
    b.setOwnerOverride?.username ||
    set?.creator?.username ||
    'unknown';
  const ruleset = rulesetName(b.ruleset);
  const embed: APIEmbed = {
    color: summary.totalGameCount > 0 ? primary : grey,
    author: { name: `${ruleset} · mapped by ${mapper}` },
    title: `${artist} - ${title} [${b.diffName}]`,
    url: `${ctx.siteUrl}/beatmaps/${b.osuId}`,
    ...(set
      ? {
          image: {
            url: `https://assets.ppy.sh/beatmaps/${set.osuId}/covers/cover@2x.jpg`,
          },
        }
      : {}),
    footer: { text: `o!TR · ${ruleset} · stats from verified games only` },
  };
  const specs = `★ **${b.sr.toFixed(2)}** · ${Math.round(b.bpm)} BPM · ${duration(b.totalLength)} · CS ${setting(b.cs)} · AR ${setting(b.ar)} · OD ${setting(b.od)} · HP ${setting(b.hp)} · ${link('osu!', `https://osu.ppy.sh/b/${b.osuId}`)}`;
  return { embed, specs, ruleset };
};

const nav = (stats: BeatmapStatsResponse, active: View) => {
  const id = (view: View): CustomId => ({
    view,
    key: String(stats.beatmap.osuId),
    ruleset: null,
    page: 1,
  });
  return row(
    button('Overview', id('bo'), active === 'bo'),
    ...(stats.summary.totalGameCount > 0
      ? [button('Scores', id('bs'), active === 'bs')]
      : []),
    button('Tournaments', id('bt'), active === 'bt'),
    linkButton('osu!', `https://osu.ppy.sh/b/${stats.beatmap.osuId}`)
  );
};

const scoreTable = (stats: BeatmapStatsResponse, count: number) =>
  table(
    [
      ['#', 'Score', 'Player', 'Mods', 'Acc', 'Tournament'],
      ...stats.topPerformers
        .slice(0, count)
        .map((s, i) => [
          String(i + 1),
          num(s.score),
          clip(s.player.username, 15),
          mods(s.mods),
          s.accuracy === null ? '—' : pct(s.accuracy, 1),
          clip(s.tournament.name, 24),
        ]),
    ],
    [true, true, false, false, true, false]
  );

const recentTournaments = (stats: BeatmapStatsResponse) =>
  [...stats.tournaments].sort((a, b) => time(b.startTime) - time(a.startTime));

export function beatmapCard(
  stats: BeatmapStatsResponse,
  ctx: ViewContext
): Reply {
  const { embed, specs } = shell(stats, ctx);
  const { summary } = stats;
  const fields: NonNullable<APIEmbed['fields']> = [];

  const pooled =
    summary.totalGameCount > 0
      ? `Pooled in **${num(summary.totalTournamentCount)}** tournaments (${num(summary.verifiedTournamentCount)} verified) · **${num(summary.totalGameCount)}** verified games`
      : `No verified games yet. Pooled in ${num(summary.totalTournamentCount)} tournaments.`;

  if (summary.totalGameCount > 0) {
    const distribution = filterBeatmapModDistribution(
      calculateBeatmapModDistribution(stats.modDistribution)
    ).slice(0, 6);
    if (distribution.length > 0) {
      fields.push({
        name: 'Mods',
        value: table(
          distribution.map((m) => [
            m.label,
            bar(m.percentage / 100),
            `${Math.round(m.percentage)}%`,
          ]),
          [false, false, true]
        ),
      });
    }
    if (stats.topPerformers.length > 0) {
      fields.push({ name: 'Top scores', value: scoreTable(stats, 3) });
    }
  }

  const recent = recentTournaments(stats).slice(0, 3);
  if (recent.length > 0) {
    fields.push({
      name: 'Recent pools',
      value: recent
        .map(
          (t) =>
            `${link(clip(t.tournament.name, 40), `${ctx.siteUrl}/tournaments/${t.tournament.id}`)} ${lobby(t.lobbySize)} ${rankRange(t.rankRangeLowerBound)}`
        )
        .join(' · '),
    });
  }

  return {
    embeds: [{ ...embed, description: `${specs}\n${pooled}`, fields }],
    components: [nav(stats, 'bo')],
  };
}

export function beatmapScores(
  stats: BeatmapStatsResponse,
  ctx: ViewContext
): Reply {
  const { embed, specs } = shell(stats, ctx);
  const chart = percentileCurve(stats.scorePercentiles, {
    color: hex(primary),
  });
  const fields: NonNullable<APIEmbed['fields']> = [
    {
      name: 'Top scores',
      value:
        stats.topPerformers.length > 0
          ? scoreTable(stats, 10)
          : 'No verified scores yet.',
    },
  ];

  return {
    embeds: [
      {
        ...embed,
        description: `${specs}\n**${num(stats.chartedScoreCount)}** scores on the curve (NM, HD, HR, DT)`,
        fields,
        ...(chart ? { image: { url: 'attachment://scores.png' } } : {}),
      },
    ],
    components: [nav(stats, 'bs')],
    ...(chart
      ? { files: [{ name: 'scores.png', data: renderPng(chart) }] }
      : {}),
  };
}

export function beatmapTournaments(
  stats: BeatmapStatsResponse,
  id: CustomId,
  ctx: ViewContext
): Reply {
  const { embed, specs, ruleset } = shell(stats, ctx);
  const all = recentTournaments(stats);
  const { pages, page, items } = paginate(all, id.page, 8);
  const rows =
    items.length > 0
      ? items
          .map((t) =>
            [
              link(
                clip(t.tournament.name, 50),
                `${ctx.siteUrl}/tournaments/${t.tournament.id}`
              ),
              lobby(t.lobbySize),
              rankRange(t.rankRangeLowerBound),
              `${num(t.gameCount)} games`,
              t.startTime ? when(t.startTime, 'd') : null,
              t.verificationStatus === VerificationStatus.Verified
                ? null
                : statusName(t.verificationStatus),
            ]
              .filter(Boolean)
              .join(' · ')
          )
          .join('\n')
      : 'Not pooled in any tournament yet.';

  return {
    embeds: [
      {
        ...embed,
        description: `${specs}\n\n${rows}`,
        footer: {
          text: `o!TR · ${ruleset} · ${num(all.length)} tournaments · page ${page} of ${pages}`,
        },
      },
    ],
    components: [nav(stats, 'bt'), ...pager({ ...id, page }, pages)],
  };
}
