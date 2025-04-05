import { 
  PlayerSearchResultDTO, 
  TournamentSearchResultDTO, 
  MatchSearchResultDTO 
} from '@osu-tournament-rating/otr-api-client';
import { Dispatch, SetStateAction, ReactNode } from 'react';

export interface SearchDialogContextType {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  dialogOpen: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
}

export interface PlayerSearchResultProps {
  input: string;
  data: PlayerSearchResultDTO;
}

export interface TournamentSearchResultProps {
  input: string;
  data: TournamentSearchResultDTO;
}

export interface MatchSearchResultProps {
  input: string;
  data: MatchSearchResultDTO;
}

export interface SearchResultsProps {
  input: string;
  data: {
    players: PlayerSearchResultDTO[];
    tournaments: TournamentSearchResultDTO[];
    matches: MatchSearchResultDTO[];
  } | undefined;
}

export interface SearchResultSectionProps {
  title: string;
  emptyMessage: string;
  children: ReactNode;
}
