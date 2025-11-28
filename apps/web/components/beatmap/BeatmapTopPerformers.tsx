'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ModsEnumHelper } from '@/lib/enums';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapTopPerformersProps {
  performers: BeatmapTopPerformer[];
  className?: string;
}

export default function BeatmapTopPerformers({
  performers,
  className,
}: BeatmapTopPerformersProps) {
  const formatModLabel = (mods: number) => {
    if (mods === 0) return 'NM';
    const metadata = ModsEnumHelper.getMetadata(mods);
    const label = metadata
      .map((meta) => meta.text)
      .join('')
      .replace(/NF/g, '')
      .replace(/SO/g, '');
    return label === '' ? 'NM' : label;
  };

  if (performers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No performance data available for this beatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {performers.map((performer, index) => (
          <Link
            key={`${performer.player.id}-${index}`}
            href={`/players/${performer.player.id}`}
            className="bg-popover hover:bg-accent flex items-center justify-between rounded-lg p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-6 text-sm font-medium">
                #{index + 1}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://a.ppy.sh/${performer.player.osuId}`}
                  alt={performer.player.username}
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {performer.player.username}
                </div>
                <div className="text-muted-foreground text-xs">
                  {performer.accuracy !== null
                    ? `${performer.accuracy.toFixed(2)}% accuracy`
                    : 'No accuracy data'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="text-muted-foreground">
                {formatModLabel(performer.mods)}
              </div>
              <div className="font-medium">
                {performer.score.toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
