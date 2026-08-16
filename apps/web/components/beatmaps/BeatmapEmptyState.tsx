import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

/** The "nothing here" block for beatmap list surfaces. */
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
    <div
      data-testid={testId}
      className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted dark:bg-secondary">
        <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
