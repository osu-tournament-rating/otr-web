'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type * as React from 'react';

import { IconButton } from '@/components/kit/controls/IconButton';
import { Input } from '@/components/ui/input';
import {
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  getSearchMinimumHint,
  isBelowSearchMinimum,
  normalizeSearchTerm,
} from '@/lib/kit/lists/search';
import { cn } from '@/lib/utils';

/**
 * The one search box. It waits `SEARCH_DEBOUNCE_MS` after the last keystroke
 * (Enter searches at once), shows a spinner until results arrive, explains
 * the minimum length, and has a clear button. Use it in every list toolbar
 * and in the header search.
 */
export function SearchField({
  value,
  onSearch,
  label,
  placeholder,
  pending = false,
  minLength = MIN_SEARCH_LENGTH,
  maxLength = MAX_SEARCH_LENGTH,
  delay = SEARCH_DEBOUNCE_MS,
  autoFocus,
  className,
  inputClassName,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange' | 'children'> & {
  /** The term the list is showing results for, usually from `useListState`. */
  value: string;
  /** Called with the trimmed term, or `''` when it is cleared or too short. */
  onSearch: (term: string) => void;
  /** The accessible name, such as "Search tournaments". */
  label: string;
  placeholder?: string;
  /** True while results for the last term are loading (`isPending`). */
  pending?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Only for tests and the header's own timing; lists keep the default. */
  delay?: number;
  autoFocus?: boolean;
  inputClassName?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  const [waiting, setWaiting] = useState(false);
  const [awaitingResults, setAwaitingResults] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // The term this field last sent, so a late echo of it never overwrites newer typing.
  const sent = useRef(normalizeSearchTerm(value, minLength));
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Follow outside changes (back button, a cleared filter), not our own echo.
  useEffect(() => {
    const landed = normalizeSearchTerm(value, minLength);
    if (landed === sent.current) return;
    sent.current = landed;
    window.clearTimeout(timer.current);
    setWaiting(false);
    setText((current) =>
      normalizeSearchTerm(current, minLength) === landed ? current : value
    );
  }, [minLength, value]);

  useEffect(() => {
    if (!pending) setAwaitingResults(false);
  }, [pending]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const send = (raw: string) => {
    window.clearTimeout(timer.current);
    setWaiting(false);
    const term = normalizeSearchTerm(raw, minLength);
    if (term === sent.current) return;
    sent.current = term;
    setAwaitingResults(true);
    onSearchRef.current(term);
  };

  const change = (next: string) => {
    setText(next);
    window.clearTimeout(timer.current);
    const term = normalizeSearchTerm(next, minLength);
    if (term === sent.current) {
      setWaiting(false);
      return;
    }
    setWaiting(true);
    timer.current = window.setTimeout(() => send(next), delay);
  };

  const clear = () => {
    setText('');
    send('');
    inputRef.current?.focus();
  };

  const belowMinimum = isBelowSearchMinimum(text, minLength);
  const busy = waiting || (awaitingResults && pending);

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)} {...props}>
      <div className="relative min-w-0">
        {busy ? (
          <Loader2
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : (
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        )}
        <Input
          ref={inputRef}
          id={id}
          type="search"
          value={text}
          onChange={(event) => change(event.target.value.trimStart())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              send(text);
            } else if (event.key === 'Escape' && text) {
              event.preventDefault();
              clear();
            }
          }}
          aria-label={label}
          aria-describedby={belowMinimum ? hintId : undefined}
          aria-busy={busy || undefined}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          className={cn(
            'h-10 bg-background pr-10 pl-9 dark:bg-input/50 dark:shadow-none',
            '[&::-webkit-search-cancel-button]:appearance-none',
            inputClassName
          )}
        />
        {text ? (
          <IconButton
            label="Clear search"
            icon={X}
            onClick={clear}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          />
        ) : null}
      </div>
      {/* Always mounted, so screen readers announce the hint when it appears. */}
      <p
        id={hintId}
        aria-live="polite"
        className={belowMinimum ? 'text-xs text-muted-foreground' : 'sr-only'}
      >
        {belowMinimum ? getSearchMinimumHint(minLength) : null}
      </p>
    </div>
  );
}
