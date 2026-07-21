import { Gamepad2, Gauge, Library, Trophy, UsersRound } from 'lucide-react';

import type {
  BeatmapStatsSummary,
  BeatmapWithDetails,
} from '@/lib/orpc/schema/beatmapStats';

export default function BeatmapBannerData({
  beatmap,
  summary,
}: {
  beatmap: BeatmapWithDetails;
  summary: BeatmapStatsSummary;
}) {
  const attributes = [
    { abbreviation: 'CS', label: 'Circle size', value: beatmap.cs },
    { abbreviation: 'AR', label: 'Approach rate', value: beatmap.ar },
    { abbreviation: 'OD', label: 'Overall difficulty', value: beatmap.od },
    { abbreviation: 'HP', label: 'HP drain', value: beatmap.hp },
  ];
  const usage = [
    {
      label: 'Games',
      value: summary.totalGameCount,
      icon: Gamepad2,
    },
    {
      label: 'Tournaments',
      value: summary.verifiedPlayedTournamentCount,
      icon: Trophy,
    },
    {
      label: 'Players',
      value: summary.totalPlayerCount,
      icon: UsersRound,
    },
    {
      label: 'Pool records',
      value: summary.totalTournamentCount,
      icon: Library,
    },
  ];

  return (
    <div className="mt-6 grid overflow-hidden rounded-xl border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-md lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="min-w-0 p-3.5 sm:p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <Gauge className="size-4" aria-hidden="true" />
          <h2>Attributes</h2>
        </div>

        <dl className="mt-3 grid grid-cols-4 divide-x divide-white/15 text-center">
          {attributes.map(({ abbreviation, label, value }) => (
            <div key={abbreviation} className="min-w-0 px-2">
              <dt className="text-[11px] font-medium text-white/65 uppercase sm:text-xs">
                <abbr title={label} className="cursor-help no-underline">
                  <span aria-hidden="true">{abbreviation}</span>
                  <span className="sr-only">{label}</span>
                </abbr>
              </dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                {value.toFixed(1)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="min-w-0 border-t border-white/15 p-3.5 sm:p-4 lg:border-t-0 lg:border-l">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <Trophy className="size-4" aria-hidden="true" />
          <h2>Tournament usage</h2>
        </div>

        <dl
          data-testid="beatmap-stats-card"
          className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4"
        >
          {usage.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] text-white/65 sm:text-xs">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                {value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
