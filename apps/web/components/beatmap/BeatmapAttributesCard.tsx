import { Gauge } from 'lucide-react';

import {
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';

const ATTRIBUTE_SCALE_MAX = 10;

export default function BeatmapAttributesCard({
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
    <SectionCard data-testid="beatmap-attributes">
      <SectionHeader icon={Gauge} title="Attributes" />
      <dl className="divide-y">
        {attributes.map(({ abbreviation, label, value }) => (
          <div
            key={abbreviation}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <dt className="w-6 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">
              <abbr title={label} className="cursor-help no-underline">
                <span aria-hidden>{abbreviation}</span>
                <span className="sr-only">{label}</span>
              </abbr>
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-foreground/60"
                  style={{
                    width: `${Math.min(100, (value / ATTRIBUTE_SCALE_MAX) * 100)}%`,
                  }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                {value.toFixed(1)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
