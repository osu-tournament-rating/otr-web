import { VerificationStatus } from '@otr/core/osu';
import type { APIEmbed } from 'discord.js';

import { TournamentRejectionReasonEnumHelper } from '@/lib/enum-helpers';
import type { TournamentDetail } from '@/lib/orpc/schema/tournament';

import type { Reply, ViewContext } from '../command';
import type { CustomId } from '../custom-id';
import { linkButton, pager, tabs } from './buttons';
import {
  clip,
  inProgress,
  link,
  lobby,
  mapTitle,
  num,
  paginate,
  plural,
  rankRange,
  rulesetName,
  signed,
  statusName,
  table,
  time,
  when,
} from './format';
import { logo } from './icons';
import { statusColor } from './theme';

type View = 'to' | 'tp' | 'tb' | 'tm';

/** The detail payload trimmed and sorted to what the card and pages show. */
function summarize(detail: TournamentDetail) {
  const players = [...detail.playerTournamentStats]
    .sort((a, b) => b.averageMatchCost - a.averageMatchCost)
    .map((p) => ({
      username: p.player.username,
      matchCost: p.averageMatchCost,
      won: p.matchesWon,
      lost: p.matchesLost,
      delta: p.ratingAfter - p.ratingBefore,
    }));
  const pool = [...detail.pooledBeatmaps]
    .sort((a, b) => {
      const modA = a.topMods[0]?.mod;
      const modB = b.topMods[0]?.mod;
      return (
        Number(!modA) - Number(!modB) ||
        (modA ?? '').localeCompare(modB ?? '') ||
        b.sr - a.sr
      );
    })
    .map((b) => ({
      osuId: b.osuId,
      sr: b.sr,
      bpm: b.bpm,
      title: mapTitle(b),
      topMod: b.topMods[0] ?? null,
    }));
  const matches = [...detail.matches]
    .sort((a, b) => time(b.startTime) - time(a.startTime))
    .map((m) => ({
      id: m.id,
      name: m.name,
      startTime: m.startTime,
      score: m.winRecord
        ? `${m.winRecord.winnerPoints}-${m.winRecord.loserPoints}`
        : null,
    }));
  const ratings = detail.pooledBeatmaps.map((b) => b.sr);

  return {
    id: detail.id,
    name: detail.name,
    abbreviation: detail.abbreviation,
    forumUrl: detail.forumUrl,
    ruleset: detail.ruleset,
    lobbySize: detail.lobbySize,
    rankRangeLowerBound: detail.rankRangeLowerBound,
    startTime: detail.startTime,
    endTime: detail.endTime,
    verificationStatus: detail.verificationStatus,
    rejectionReason: detail.rejectionReason,
    isLazer: detail.isLazer,
    matchCount: detail.matches.length,
    gameCount: detail.matches.reduce((sum, m) => sum + m.games.length, 0),
    srMin: ratings.length > 0 ? Math.min(...ratings) : null,
    srMax: ratings.length > 0 ? Math.max(...ratings) : null,
    players,
    pool,
    matches,
  };
}

type TournamentSummary = ReturnType<typeof summarize>;

const shell = (t: TournamentSummary, ctx: ViewContext) => {
  const ruleset = rulesetName(t.ruleset);
  const embed: APIEmbed = {
    color: statusColor(t.verificationStatus),
    author: {
      name: `${ruleset} · ${lobby(t.lobbySize)} · ${rankRange(t.rankRangeLowerBound)} · ${statusName(t.verificationStatus)}`,
    },
    title: `${t.name} (${t.abbreviation})`,
    url: `${ctx.siteUrl}/tournaments/${t.id}`,
    thumbnail: { url: 'attachment://logo.png' },
    footer: { text: `o!TR · ${ruleset} · stats from verified matches` },
    ...(t.endTime ? { timestamp: t.endTime } : {}),
  };
  return { embed, files: [{ name: 'logo.png', data: logo() }], ruleset };
};

const nav = (t: TournamentSummary, active: View, page: number) =>
  tabs(
    String(t.id),
    null,
    active,
    page,
    [
      ['Overview', 'to'],
      ['Players', 'tp'],
      ['Pool', 'tb'],
      ['Matches', 'tm'],
    ],
    linkButton('Forum', t.forumUrl)
  );

const playerTable = (players: TournamentSummary['players'], from: number) =>
  table(
    [
      ['#', 'Player', 'MC', 'W-L', 'ΔTR'],
      ...players.map((p, i) => [
        String(from + i),
        clip(p.username, 16),
        p.matchCost.toFixed(2),
        `${p.won}-${p.lost}`,
        signed(p.delta),
      ]),
    ],
    [true, false, true, true, true]
  );

const statusLine = (t: TournamentSummary) => {
  switch (t.verificationStatus) {
    case VerificationStatus.PreVerified:
      return 'Pre-verified: awaiting manual review, not in ratings yet.';
    case VerificationStatus.None:
      return 'Pending review.';
    default:
      return null;
  }
};

const rejected = (t: TournamentSummary) =>
  t.verificationStatus === VerificationStatus.Rejected ||
  t.verificationStatus === VerificationStatus.PreRejected;

export function tournamentCard(
  detail: TournamentDetail,
  ctx: ViewContext
): Reply {
  const t = summarize(detail);
  const { embed, files } = shell(t, ctx);
  const dates = [t.startTime, t.endTime]
    .filter((iso): iso is string => iso !== null)
    .map((iso) => when(iso, 'D'))
    .join(' – ');
  const counts = [
    `**${num(t.matchCount)}** ${plural(t.matchCount, 'match', 'matches')}`,
    `**${num(t.gameCount)}** ${plural(t.gameCount, 'game')}`,
    `**${num(t.players.length)}** ${plural(t.players.length, 'player')}`,
    `**${num(t.pool.length)}** ${plural(t.pool.length, 'map')}`,
    t.srMin !== null && t.srMax !== null
      ? `${t.srMin.toFixed(1)}★–${t.srMax.toFixed(1)}★`
      : null,
  ].filter(Boolean);
  const description = [
    [dates || null, link('Forum post', t.forumUrl), t.isLazer ? 'lazer' : null]
      .filter(Boolean)
      .join(' · '),
    counts.join(' · '),
    statusLine(t),
  ]
    .filter(Boolean)
    .join('\n');

  const fields: NonNullable<APIEmbed['fields']> = [];
  if (rejected(t)) {
    const reasons = TournamentRejectionReasonEnumHelper.getMetadata(
      t.rejectionReason
    ).map((m) => m.text);
    fields.push({
      name: 'Reason',
      value: reasons.length > 0 ? reasons.join(', ') : 'Not recorded',
    });
  } else if (t.verificationStatus === VerificationStatus.Verified) {
    fields.push({
      name: 'Top match cost',
      value:
        t.players.length > 0
          ? playerTable(t.players.slice(0, 5), 1)
          : inProgress,
    });
  }

  return {
    embeds: [{ ...embed, description, fields }],
    components: [nav(t, 'to', 1)],
    files,
  };
}

const page = (
  detail: TournamentDetail,
  view: View,
  id: CustomId,
  ctx: ViewContext,
  render: (
    t: TournamentSummary,
    page: number
  ) => { body: string; pages: number; count: number; unit: string }
): Reply => {
  const t = summarize(detail);
  const { embed, files, ruleset } = shell(t, ctx);
  const { body, pages, count, unit } = render(t, id.page);
  const current = Math.min(id.page, pages);
  return {
    embeds: [
      {
        ...embed,
        description: body,
        footer: {
          text: `o!TR · ${ruleset} · ${num(count)} ${unit} · page ${current} of ${pages}`,
        },
      },
    ],
    components: [
      nav(t, view, current),
      ...pager({ ...id, page: current }, pages),
    ],
    files,
  };
};

export const tournamentPlayers = (
  detail: TournamentDetail,
  id: CustomId,
  ctx: ViewContext
) =>
  page(detail, 'tp', id, ctx, (t, current) => {
    const { pages, page, items } = paginate(t.players, current, 10);
    return {
      body:
        items.length > 0
          ? playerTable(items, (page - 1) * 10 + 1)
          : t.verificationStatus === VerificationStatus.Verified
            ? inProgress
            : 'Player stats exist for verified tournaments only.',
      pages,
      count: t.players.length,
      unit: plural(t.players.length, 'player'),
    };
  });

export const tournamentPool = (
  detail: TournamentDetail,
  id: CustomId,
  ctx: ViewContext
) =>
  page(detail, 'tb', id, ctx, (t, current) => {
    const { pages, items } = paginate(t.pool, current, 8);
    return {
      body:
        items.length > 0
          ? items
              .map(
                (b) =>
                  `★${b.sr.toFixed(2)} · ${Math.round(b.bpm)} BPM${b.topMod ? ` · ${b.topMod.mod} ${Math.round(b.topMod.percentage)}%` : ''} · ${link(clip(b.title, 80), `${ctx.siteUrl}/beatmaps/${b.osuId}`)}`
              )
              .join('\n')
          : 'No pooled maps recorded.',
      pages,
      count: t.pool.length,
      unit: plural(t.pool.length, 'map'),
    };
  });

export const tournamentMatches = (
  detail: TournamentDetail,
  id: CustomId,
  ctx: ViewContext
) =>
  page(detail, 'tm', id, ctx, (t, current) => {
    const { pages, items } = paginate(t.matches, current, 8);
    return {
      body:
        items.length > 0
          ? items
              .map((m) =>
                [
                  link(clip(m.name, 60), `${ctx.siteUrl}/matches/${m.id}`),
                  m.score,
                  m.startTime ? when(m.startTime, 'd') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              )
              .join('\n')
          : 'No matches recorded.',
      pages,
      count: t.matches.length,
      unit: plural(t.matches.length, 'match', 'matches'),
    };
  });
