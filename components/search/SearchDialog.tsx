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

  const [debouncedQuery, { flush }] = useDebounce(query, 500);

  useEffect(() => {
    if (query === '') {
      flush();
    }
  }, [query, flush]);

  const { data, isLoading } = useSearch(debouncedQuery);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setQuery('');
    }
  };

  return (
    <SearchDialogContext.Provider value={contextValue}>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer"
          >
            <Search className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogContent className="max-h-[80vh] min-w-[50%] overflow-auto p-4 font-sans [&>button]:hidden">
          <div className="sticky top-0 z-10 bg-background pb-4">
            <div className="relative">
              <Input
                className="m-auto rounded-xl border-0 bg-accent pl-3 pr-10 focus-visible:ring-0"
                placeholder="Search players, tournaments, matches..."
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search query"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {isLoading ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Search className="size-5" />
                )}
              </div>
            </div>
          </div>
          <SearchResults input={debouncedQuery} data={data} />
        </DialogContent>
      </Dialog>
    </SearchDialogContext.Provider>
  );
}
