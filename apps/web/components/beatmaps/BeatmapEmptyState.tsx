import type { ReactNode } from 'react';

import { EmptyState } from '@/components/kit/feedback/EmptyState';

/**
 * The old name for the kit EmptyState, kept while other pages still import
 * it. New code uses `EmptyState` from `@/components/kit/feedback/EmptyState`.
 */
export default function BeatmapEmptyState({
  testId,
  title,
  body,
  action,
}: {
  testId?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <EmptyState
      data-testid={testId}
      title={title}
      description={body}
      action={action}
    />
  );
}
