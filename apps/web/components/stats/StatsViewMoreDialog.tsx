'use client';

import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Ruleset } from '@otr/core/osu';
import { cn } from '@/lib/utils';
import { paginate } from '@/lib/utils/paging';
import { stickyTableHeaderInScrollArea } from '@/lib/utils/table';

const PAGE_SIZE = 50;

export type StatsDialogColumn<T> = {
  key: string;
  header: ReactNode;
  /** Width and alignment, applied to the header and every cell. */
  className?: string;
  cellClassName?: string;
  cell: (item: T, index: number) => ReactNode;
};

/** The "View more" footer of a statistics card and the paged table it opens. */
export default function StatsViewMoreDialog<T>({
  title,
  description,
  ruleset,
  items,
  columns,
  rowKey,
  'data-testid': testId,
}: {
  title: string;
  description: string;
  ruleset: Ruleset;
  items: readonly T[];
  columns: readonly StatsDialogColumn<T>[];
  rowKey: (item: T, index: number) => string;
  'data-testid'?: string;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [items]);

  const {
    items: visible,
    page: current,
    pageCount,
    rangeLabel,
  } = paginate(items, page, PAGE_SIZE);
  const offset = (current - 1) * PAGE_SIZE;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`View more ${title.toLowerCase()}`}
          data-testid={testId ? `${testId}-trigger` : undefined}
          className="mt-auto flex cursor-pointer items-center justify-center gap-1.5 border-t px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted/25 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          View more
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </DialogTrigger>

      {/* `min()` keeps DialogContent's 1rem gutter; a bare `sm:max-w-3xl` wins the cascade */}
      <DialogContent
        data-testid={testId}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(48rem,calc(100%-2rem))]"
      >
        <DialogHeader className="gap-1 border-b px-4 py-3 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <RulesetIcon
              ruleset={ruleset}
              className="size-5 shrink-0 fill-primary"
            />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Focusable so the table scrolls by keyboard */}
        <div
          tabIndex={0}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset',
            stickyTableHeaderInScrollArea
          )}
        >
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-muted">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn('h-8', column.className)}
                  >
                    <Eyebrow>{column.header}</Eyebrow>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((item, index) => (
                <TableRow
                  key={rowKey(item, offset + index)}
                  className="hover:bg-muted/25"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'truncate',
                        column.className,
                        column.cellClassName
                      )}
                    >
                      {column.cell(item, offset + index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
          <span
            data-testid={testId ? `${testId}-range` : undefined}
            className="text-xs text-muted-foreground"
          >
            {rangeLabel}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              data-testid={testId ? `${testId}-previous` : undefined}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current === pageCount}
              onClick={() => setPage(current + 1)}
              data-testid={testId ? `${testId}-next` : undefined}
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
