import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';
import { ExternalLink, Gauge, ListMusic } from 'lucide-react';
import Link from 'next/link';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
} from '@/lib/beatmaps/presentation';
import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';

const rankedStatusLabels: Record<number, string> = {
  [-2]: 'Graveyard',
  [-1]: 'WIP',
  0: 'Pending',
  1: 'Ranked',
  2: 'Approved',
  3: 'Qualified',
  4: 'Loved',
};

export default function BeatmapMetadataPanel({
  beatmap,
}: {
  beatmap: BeatmapWithDetails;
}) {
  const ruleset = getBeatmapDisplayRuleset(beatmap.ruleset, beatmap.diffName);
  const rulesetLabel = getBeatmapRulesetLabel(
    beatmap.ruleset,
    beatmap.diffName
  );
  const objectCount =
    beatmap.countCircle + beatmap.countSlider + beatmap.countSpinner;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Gauge className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-semibold">Map data</h2>
      </div>

      <dl className="divide-y text-sm">
        <MetadataRow
          label="Ruleset"
          value={
            <span className="inline-flex items-center gap-1.5">
              <RulesetIcon
                ruleset={ruleset}
                className="size-4 fill-current"
                aria-hidden="true"
              />
              {rulesetLabel}
            </span>
          }
        />
        <MetadataRow
          label="SR (star rating)"
          value={`${beatmap.sr.toFixed(2)} SR`}
          emphasized
        />
        <MetadataRow label="BPM" value={Math.round(beatmap.bpm)} />
        <MetadataRow
          label="Length / drain"
          value={`${formatSecondsToMinutesSeconds(beatmap.totalLength)} / ${formatSecondsToMinutesSeconds(beatmap.drainLength)}`}
        />
        <MetadataRow
          label="CS / AR / OD / HP"
          value={`${beatmap.cs.toFixed(1)} / ${beatmap.ar.toFixed(1)} / ${beatmap.od.toFixed(1)} / ${beatmap.hp.toFixed(1)}`}
        />
        <MetadataRow label="Objects" value={objectCount.toLocaleString()} />
        <MetadataRow
          label="Max combo"
          value={beatmap.maxCombo?.toLocaleString() ?? '—'}
        />
        <MetadataRow
          label="osu! status"
          value={rankedStatusLabels[beatmap.rankedStatus] ?? 'Unknown'}
        />
        <MetadataRow
          label="Beatmap ID"
          value={<span className="font-mono">{beatmap.osuId}</span>}
        />
      </dl>

      <div className="grid grid-cols-2 gap-2 border-t p-3">
        <Button asChild variant="outline" size="sm">
          <Link
            href={`https://osu.ppy.sh/beatmaps/${beatmap.osuId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink aria-hidden="true" />
            osu!
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/beatmaps">
            <ListMusic aria-hidden="true" />
            Archive
          </Link>
        </Button>
      </div>
    </section>
  );
}

function MetadataRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={emphasized ? 'font-semibold text-primary' : 'text-right'}>
        {value}
      </dd>
    </div>
  );
}
