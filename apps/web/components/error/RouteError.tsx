'use client';

import { useTransition } from 'react';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/kit/controls/Button';
import { StatusPage } from '@/components/kit/feedback/StatusPage';

export type RouteErrorProps = {
  title: string;
  description?: string;
  /** A way out when trying again keeps failing. */
  back?: { href: string; label: string };
  /** The `retry` that Next passes to error.tsx. */
  retry: () => void;
};

/**
 * The page that a route's error.tsx shows when the route fails to render: the
 * kit StatusPage in red, with an optional way back before Try again.
 */
export default function RouteError({
  title,
  description = 'Something went wrong on our side. Try again in a moment.',
  back,
  retry,
}: RouteErrorProps) {
  const [retrying, startRetry] = useTransition();

  return (
    <StatusPage
      icon={AlertCircle}
      tone="destructive"
      role="alert"
      title={title}
      description={description}
      action={
        <>
          {back ? (
            <Button asChild variant="outline" icon={ArrowLeft}>
              <Link href={back.href}>{back.label}</Link>
            </Button>
          ) : null}
          <Button
            icon={RefreshCw}
            pending={retrying}
            onClick={() => startRetry(retry)}
          >
            Try again
          </Button>
        </>
      }
    />
  );
}
