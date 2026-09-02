import type { LeaderboardResponse } from '@/lib/orpc/schema/leaderboard';

import type { Reply, ViewContext } from '../command';
import type { CustomId } from '../custom-id';
import { button, linkButton, row } from './buttons';
import { flag, link, num, pct, rulesetName, tier } from './format';
import { logo } from './icons';
import { primary } from './theme';

export function leaderboardPage(
  response: LeaderboardResponse,
  id: CustomId,
  ctx: ViewContext
): Reply {
  const ruleset = rulesetName(response.ruleset);
  const country = id.country?.toUpperCase();
  const pages = Math.max(1, response.pages);
  const query = new URLSearchParams({
    page: String(response.page),
    ruleset: String(response.ruleset),
    ...(country ? { country } : {}),
  });
  const url = `${ctx.siteUrl}/leaderboard?${query}`;
  const rows = response.leaderboard.map(
    (entry) =>
      `**#${num(country ? entry.countryRank : entry.globalRank)}** ${flag(entry.player.country)} ${link(entry.player.username, `${ctx.siteUrl}/players/${entry.player.id}`)} · **${num(entry.rating)}** · ${tier(entry.tierProgress)} · ${num(entry.matchesPlayed)} m · ${pct(entry.winRate)}`
  );
  const page: CustomId = { ...id, page: response.page };

  return {
    embeds: [
      {
        color: primary,
        title: [`${ruleset} leaderboard`, `page ${response.page}`, country]
          .filter(Boolean)
          .join(' · '),
        url,
        thumbnail: { url: 'attachment://logo.png' },
        description:
          rows.length > 0 ? rows.join('\n') : 'No rated players match.',
        footer: {
          text: `o!TR · ${ruleset} · ${num(response.total)} rated players · page ${response.page} of ${pages}`,
        },
      },
    ],
    components: [
      row(
        {
          ...button('◀', { ...page, page: Math.max(1, response.page - 1) }),
          disabled: response.page <= 1,
        },
        {
          ...button('▶', { ...page, page: Math.min(pages, response.page + 1) }),
          disabled: response.page >= pages,
        },
        linkButton('Open on o!TR', url)
      ),
    ],
    files: [{ name: 'logo.png', data: logo() }],
  };
}
