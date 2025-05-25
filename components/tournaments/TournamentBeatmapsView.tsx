'use client';

import { BeatmapDTO } from '@osu-tournament-rating/otr-api-client';
import { Card } from '@/components/ui/card';
import { Music } from 'lucide-react';
import { formatDuration } from '@/lib/utils/date';

interface TournamentBeatmapsViewProps {
  beatmaps: BeatmapDTO[];
}

export default function TournamentBeatmapsView({
  beatmaps,
}: TournamentBeatmapsViewProps) {
  if (beatmaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No Beatmaps Found
        </h3>
        <p className="text-sm text-muted-foreground">
          This tournament has no pooled beatmaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {beatmaps.map((beatmap) => (
          <Card key={beatmap.id} className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">
                    {beatmap.beatmapset?.title || 'Unknown Title'}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  by {beatmap.beatmapset?.artist || 'Unknown Artist'}
                </p>
                {beatmap.diffName && (
                  <p className="text-sm font-medium text-primary">
                    [{beatmap.diffName}]
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex flex-col items-center">
                  <span className="font-medium text-foreground">
                    {beatmap.sr.toFixed(2)}★
                  </span>
                  <span className="text-xs">Star Rating</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-medium text-foreground">
                    {formatDuration(beatmap.totalLength)}
                  </span>
                  <span className="text-xs">Length</span>
                </div>

                {beatmap.bpm && (
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-foreground">
                      {Math.round(beatmap.bpm)}
                    </span>
                    <span className="text-xs">BPM</span>
                  </div>
                )}

                <div className="flex flex-col items-center">
                  <span className="font-medium text-foreground">
                    CS{beatmap.cs}
                  </span>
                  <span className="text-xs">Circle Size</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-medium text-foreground">
                    AR{beatmap.ar}
                  </span>
                  <span className="text-xs">Approach Rate</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-medium text-foreground">
                    OD{beatmap.od}
                  </span>
                  <span className="text-xs">Overall Difficulty</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
