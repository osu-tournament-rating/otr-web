'use client';

import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import { useTournamentListFilter } from './TournamentListFilterContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronDown, ChevronUp } from 'lucide-react';

const toggleItems: { value: TournamentQuerySortType; text: string }[] = [
  {
    value: TournamentQuerySortType.Created,
    text: 'Submission Date',
  },
  {
    value: TournamentQuerySortType.StartTime,
    text: 'Start Date',
  },
  {
    value: TournamentQuerySortType.EndTime,
    text: 'End Date',
  },
  {
    value: TournamentQuerySortType.LobbySize,
    text: 'Lobby Size',
  },
];

export default function TournamentListSortControl() {
  const {
    filter: { sort, descending },
    setFilter,
    setFilterValue,
  } = useTournamentListFilter();

  const toggleDirection = () => setFilterValue('descending', !descending);

  return (
    <ToggleGroup
      className="flex gap-2"
      type="single"
      value={sort?.toString()}
      onValueChange={(val) => {
        setFilter((prev) => ({
          ...prev,
          sort: Number(val),
          descending: true,
        }));
      }}
    >
      {toggleItems.map(({ value, text }) => (
        <ToggleGroupItem
          key={`sort-${value}`}
          className="flex flex-auto"
          value={value.toString()}
          aria-label={TournamentQuerySortType[value]}
          onClick={(e) => {
            if (sort === value) {
              e.preventDefault();
              toggleDirection();
            }
          }}
        >
          {text}
          {sort === value && (descending ? <ChevronDown /> : <ChevronUp />)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
