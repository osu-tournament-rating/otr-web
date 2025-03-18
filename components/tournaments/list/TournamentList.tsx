'use client';

import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import TournamentCard from '../TournamentCard';

export default function TournamentList({
  tournaments,
}: {
  tournaments: TournamentCompactDTO[];
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useWindowVirtualizer({
    count: tournaments.length,
    estimateSize: () => 100,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={listRef}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 w-full space-y-2"
          style={{
            transform: `translateY(${
              (items[0]?.start ?? 0) - virtualizer.options.scrollMargin
            }px)`,
          }}
        >
          {items.map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
            >
              <TournamentCard
                tournament={tournaments[item.index]}
                titleIsLink
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
