'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function BeatmapsError({ reset }: { reset: () => void }) {
  return (
    <div className="container mx-auto flex min-h-[26rem] flex-col items-center justify-center px-4 py-12 text-center sm:px-0">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">Beatmaps could not load</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The beatmap listing is temporarily unavailable.
      </p>
      <Button type="button" variant="outline" onClick={reset} className="mt-5">
        <RefreshCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
