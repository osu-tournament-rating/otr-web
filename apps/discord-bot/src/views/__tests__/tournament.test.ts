import { describe, expect, test } from 'bun:test';
import { VerificationStatus } from '@otr/core/osu';

import {
  ctx,
  customIds,
  siteUrl,
  tournamentDetail,
} from '../../__tests__/fixtures';
import { finalize } from '../../runner';
import {
  tournamentCard,
  tournamentMatches,
  tournamentPlayers,
  tournamentPool,
} from '../tournament';

const id = { view: 'tb', key: '512', ruleset: null, page: 1 };

describe('tournament card', () => {
  test('a verified tournament lists counts and the top five by match cost', () => {
    const reply = tournamentCard(tournamentDetail, ctx);
    const [embed] = reply.embeds;
    expect(embed).toMatchObject({
      color: 0x5a8ff0,
      title: 'Corsace Open 2025 (CO25)',
      url: `${siteUrl}/tournaments/512`,
      thumbnail: { url: 'attachment://logo.png' },
      author: { name: 'osu! · 4v4 · #1,000+ · Verified' },
      footer: { text: 'o!TR · osu!' },
    });
    expect(embed.description).toContain(
      '[Forum post](https://osu.ppy.sh/community/forums/topics/1900512) · lazer'
    );
    expect(embed.description).toContain(
      '**12** matches · **108** games · **6** players · **11** maps · 5.2★–7.2★'
    );
    expect(embed.fields?.[0].name).toBe('Top match cost');
    const rows = embed.fields![0].value.split('\n');
    expect(rows[1]).toMatch(/^#\s+Player\s+MC\s+W-L\s+ΔTR$/);
    expect(rows[2]).toMatch(/^1\s+Cytusine\s+1\.42\s+9-1\s+\+38$/);
    expect(rows).toHaveLength(8);
    expect(reply.components).toBeUndefined();
    expect(reply.files?.[0].name).toBe('logo.png');
  });

  test('pre-verified is amber with the review line', () => {
    const [embed] = tournamentCard(
      {
        ...tournamentDetail,
        verificationStatus: VerificationStatus.PreVerified,
      },
      ctx
    ).embeds;
    expect(embed.color).toBe(0xddb246);
    expect(embed.author?.name).toEndWith('Pre-verified');
    expect(embed.description).toContain(
      'Pre-verified: awaiting manual review, not in ratings yet.'
    );
    expect(embed.fields).toEqual([]);
  });

  test('pending is grey with the pending line', () => {
    const [embed] = tournamentCard(
      { ...tournamentDetail, verificationStatus: VerificationStatus.None },
      ctx
    ).embeds;
    expect(embed.color).toBe(0x8c8c8c);
    expect(embed.description).toContain('Pending review.');
  });

  test('rejected is red with the reasons', () => {
    const [embed] = tournamentCard(
      {
        ...tournamentDetail,
        verificationStatus: VerificationStatus.Rejected,
        rejectionReason: 1 | 4,
      },
      ctx
    ).embeds;
    expect(embed.color).toBe(0xe83030);
    expect(embed.fields?.[0]).toEqual({
      name: 'Reason',
      value: 'No Verified Matches, Abnormal Win Condition',
    });
  });

  test('a verified tournament without stats says they are in progress', () => {
    const [embed] = tournamentCard(
      { ...tournamentDetail, playerTournamentStats: [] },
      ctx
    ).embeds;
    expect(embed.fields?.[0].value).toBe(
      'Stats are still in progress. Check back later.'
    );
  });

  test('a lower bound of 1 reads as open rank', () => {
    const [embed] = tournamentCard(
      { ...tournamentDetail, rankRangeLowerBound: 1 },
      ctx
    ).embeds;
    expect(embed.author?.name).toBe('osu! · 4v4 · Open rank · Verified');
  });

  test('the card stays within the limits after finalize', () => {
    expect(() => finalize(tournamentCard(tournamentDetail, ctx))).not.toThrow();
  });

  test('the pool page shows eight per page with a pager', () => {
    const reply = tournamentPool(tournamentDetail, id, ctx);
    const lines = reply.embeds[0].description!.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toMatch(
      /^★\d\.\d\d · \d+ BPM · DT 61% · \[.+\]\(.+\/beatmaps\/\d+\)$/
    );
    expect(reply.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 11 maps · page 1 of 2'
    );
    expect(reply.components).toHaveLength(2);
  });

  test('maps without a mod share sort last on the pool page', () => {
    const [first, second, third] = tournamentDetail.pooledBeatmaps;
    const detail = {
      ...tournamentDetail,
      pooledBeatmaps: [{ ...first, topMods: [] }, second, third],
    };
    const lines = tournamentPool(detail, id, ctx).embeds[0].description!.split(
      '\n'
    );
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('%');
    expect(lines[1]).toContain('%');
    expect(lines[2]).not.toContain('%');
  });

  test('a single match reads in the singular', () => {
    const detail = {
      ...tournamentDetail,
      matches: tournamentDetail.matches.slice(0, 1),
    };
    expect(tournamentCard(detail, ctx).embeds[0].description).toContain(
      '**1** match · **9** games'
    );
    expect(
      tournamentMatches(detail, { ...id, view: 'tm' }, ctx).embeds[0].footer
        ?.text
    ).toBe('o!TR · osu! · 1 match · page 1 of 1');
  });

  test('the players page numbers rows across pages', () => {
    const reply = tournamentPlayers(
      tournamentDetail,
      { ...id, view: 'tp' },
      ctx
    );
    expect(reply.embeds[0].description!.split('\n')).toHaveLength(9);
    expect(reply.components).toHaveLength(1);
  });

  test('the matches page links each match with its score and date', () => {
    const reply = tournamentMatches(
      tournamentDetail,
      { ...id, view: 'tm', page: 2 },
      ctx
    );
    const lines = reply.embeds[0].description!.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(
      new RegExp(
        `^\\[CO25: \\(Team \\d+\\) vs \\(Team \\d+\\)\\]\\(${siteUrl}/matches/\\d+\\) · 5-3 · <t:\\d+:d>$`
      )
    );
    expect(reply.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 12 matches · page 2 of 2'
    );
  });

  test('the paged views give every button a distinct id', () => {
    const views = [
      ['tp', tournamentPlayers],
      ['tb', tournamentPool],
      ['tm', tournamentMatches],
    ] as const;
    for (const [view, render] of views) {
      for (const page of [1, 2]) {
        const ids = customIds(
          render(tournamentDetail, { ...id, view, page }, ctx)
        );
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});
