'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { LoaderCircle, Search } from 'lucide-react';
import {
  useState,
  useEffect,
  createContext,
  Dispatch,
  SetStateAction,
} from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import SearchResults from './SearchResults';
import { useSearch } from '@/lib/hooks/useSearch';
import { useDebounce } from 'use-debounce';

type SearchDialogContextType = {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  dialogOpen: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export const SearchDialogContext = createContext<SearchDialogContextType>({
  query: '',
  setQuery: () => {},
  dialogOpen: false,
  setDialogOpen: () => {},
});

export default function SearchDialog() {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const contextValue = { query, setQuery, dialogOpen, setDialogOpen };

  const [value, { flush }] = useDebounce(query, 500);

  useEffect(() => {
    if (query === '') {
      setQuery('');
      flush();
    }
  }, [query, flush]);

  const { data, isLoading } = useSearch(value);

  return (
    <SearchDialogContext.Provider value={contextValue}>
      <Dialog open={dialogOpen}>
        <DialogTrigger asChild className="cursor-pointer">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDialogOpen(true);
              setQuery('');
            }} // Clear existing search on open
          >
            <Search />
          </Button>
        </DialogTrigger>
        <DialogTitle hidden />
        <DialogContent className="max-h-[80%] min-w-[50%] overflow-auto font-sans [&>button]:hidden">
          <div className="top-0 z-10 flex flex-row gap-3 bg-background">
            <Input
              className="m-auto"
              placeholder="Search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {isLoading ? (
              <LoaderCircle className="m-auto animate-spin" />
            ) : (
              <Search className="m-auto" />
            )}
          </div>
          <SearchResults input={value} data={data} />
        </DialogContent>
      </Dialog>
    </SearchDialogContext.Provider>
  );
}
