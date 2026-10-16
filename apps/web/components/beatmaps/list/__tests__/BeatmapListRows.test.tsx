import { Ruleset } from '@otr/core/osu';
import { describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import type { BeatmapTableRow } from '@/lib/beatmaps/table-row';

// Bun loads SVG imports as file paths, which React cannot render.
mock.module('@/components/icons/RulesetIcon', () => ({
  default: ({ ruleset }: { ruleset: number }) => <svg data-ruleset={ruleset} />,
}));

const { default: BeatmapListRows } =
  await import('@/components/beatmaps/list/BeatmapListRows');
const { TooltipProvider } = await import('@/components/ui/tooltip');

function row(overrides: Partial<BeatmapTableRow> = {}): BeatmapTableRow {
  return {
    id: 1,
    osuId: 665721,
    artist: 'orangentle',
    title: 'HAELEQUIN',
    diffName: "alacat's Light Insane",
    creator: 'alacat',
    beatmapsetOsuId: 1407225,
    ruleset: Ruleset.Osu,
    sr: 4.28,
    bpm: 167,
    totalLength: 136,
    cs: 4,
    ar: 8,
    od: 6.5,
    hp: 6,
    gameCount: 12,
    tournamentCount: 55,
    topMods: [],
    isDeleted: false,
    ...overrides,
  };
}

const render = (beatmaps: BeatmapTableRow[], pool?: boolean) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <BeatmapListRows beatmaps={beatmaps} pool={pool} />
    </TooltipProvider>
  );

describe('BeatmapListRows in a pool', () => {
  it('counts the pool’s own games and drops the tournament count', () => {
    const html = render([row()], true);

    expect(html).toContain('aria-label="12 games"');
    expect(html).not.toContain('beatmap-tournaments-count');
  });

  it('titles each row under the pool’s heading', () => {
    expect(render([row()], true)).toContain('<h3');
    expect(render([row()])).toContain('<h2');
  });

  it('shows the ruleset only when the pool mixes rulesets', () => {
    const osu = row();
    const taiko = row({ id: 2, osuId: 2, ruleset: Ruleset.Taiko });

    expect(render([osu, row({ id: 2, osuId: 2 })], true)).not.toContain(
      'data-testid="beatmap-ruleset"'
    );
    expect(render([osu, taiko], true)).toContain(
      'data-testid="beatmap-ruleset"'
    );
  });

  it('marks a map osu! no longer serves', () => {
    const html = render([row({ isDeleted: true })], true);

    expect(html).toContain('Deleted from osu!');
    expect(html).toContain('line-through');
  });

  it('keeps the cover and its audio preview on every row', () => {
    const html = render([row(), row({ id: 2, osuId: 2 })], true);

    expect(html.match(/data-testid="beatmap-cover-cell"/g)).toHaveLength(2);
  });
});
