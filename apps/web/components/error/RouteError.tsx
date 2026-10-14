'use client';

import { useTransition } from 'react';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RouteErrorProps = {
  title: string;
  description?: string;
  /** A way out when trying again keeps failing. */
  back?: { href: string; label: string };
  /** The `retry` that Next passes to error.tsx. */
  retry: () => void;
};

/** The page that a route's error.tsx shows when the route fails to render. */
export default function RouteError({
  title,
  description = 'Something went wrong on our side. Try again in a moment.',
  back,
  retry,
}: RouteErrorProps) {
  const [retrying, startRetry] = useTransition();

  return (
    <div
      role="alert"
      className="container mx-auto flex min-h-[26rem] flex-col items-center justify-center px-4 py-12 text-center sm:px-0"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-5 flex gap-2">
        {back && (
          <Button asChild variant="outline">
            <Link href={back.href}>
              <ArrowLeft aria-hidden="true" />
              {back.label}
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant={back ? 'default' : 'outline'}
          disabled={retrying}
          onClick={() => startRetry(retry)}
        >
          <RefreshCw
            className={cn(retrying && 'animate-spin')}
            aria-hidden="true"
          />
          Try again
        </Button>
      </div>
    </div>
  );
}
