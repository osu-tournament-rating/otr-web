import { Gauge } from 'lucide-react';

import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';

export default function BeatmapMetadataPanel({
  beatmap,
}: {
  beatmap: BeatmapWithDetails;
}) {
  const attributes = [
    { abbreviation: 'CS', label: 'Circle size', value: beatmap.cs },
    { abbreviation: 'AR', label: 'Approach rate', value: beatmap.ar },
    { abbreviation: 'OD', label: 'Overall difficulty', value: beatmap.od },
    { abbreviation: 'HP', label: 'HP drain', value: beatmap.hp },
  ];

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Gauge className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-semibold">Attributes</h2>
      </div>

      <dl className="grid grid-cols-4 divide-x text-center">
        {attributes.map(({ abbreviation, label, value }) => (
          <div key={abbreviation} className="min-w-0 px-2 py-3">
            <dt className="text-xs font-medium text-muted-foreground">
              <abbr title={label} className="cursor-help no-underline">
                <span aria-hidden="true">{abbreviation}</span>
                <span className="sr-only">{label}</span>
              </abbr>
            </dt>
            <dd className="mt-1 font-mono text-base font-semibold">
              {value.toFixed(1)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
