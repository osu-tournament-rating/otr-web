'use client';

import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function BeatmapDetailError({ reset }: { reset: () => void }) {
  return (
    <div className="container mx-auto flex min-h-[26rem] flex-col items-center justify-center px-4 py-12 text-center sm:px-0">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">Beatmap could not load</h1>
      <div className="mt-5 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/beatmaps">
            <ArrowLeft aria-hidden="true" />
            Archive
          </Link>
        </Button>
        <Button type="button" onClick={reset}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
}
