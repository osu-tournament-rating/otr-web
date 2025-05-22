'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { LoaderCircle, Search } from 'lucide-react';
import { useState, createContext } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import SearchResults from './SearchResults';
import { useSearch } from '@/lib/hooks/useSearch';
import { useDebounce } from '@uidotdev/usehooks';
import { useHotkeys } from 'react-hotkeys-hook';

export interface SearchDialogContextType {
  query: string;
  closeDialog: () => void;
}

export const SearchDialogContext = createContext<SearchDialogContextType>({
  query: '',
  closeDialog: () => {},
});

export default function SearchDialog() {
  const [query, setQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 500);
  const { data, isLoading } = useSearch(debouncedQuery);

  const handleSetQuery = (input: string) => {
    setQuery(input.trimStart());
  };

  const closeDialog = () => {
    setIsDialogOpen((open) => {
      if (!open) {
        handleSetQuery('');
      }

      return !open;
    });
  };

  useHotkeys('CTRL+K', (e) => {
    e.preventDefault();
    setIsDialogOpen((prev) => !prev);
  });

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => setIsDialogOpen(true)}
          className="cursor-pointer"
        >
          <Search className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogTitle className="sr-only">Search</DialogTitle>
      <DialogContent className="flex max-h-[80vh] min-w-[50%] flex-col p-4">
        <div className="bg-background sticky top-0 z-50 shadow-sm">
          <div className="relative">
            <Input
              className="bg-accent m-auto rounded-xl border-0 pl-3 pr-10 focus-visible:ring-0"
              placeholder="Search players, tournaments, matches..."
              autoFocus
              value={query}
              onChange={(e) => handleSetQuery(e.target.value)}
              aria-label="Search query"
            />
            <div className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">
              {isLoading ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <Search className="size-5" />
              )}
            </div>
          </div>
        </div>
        <SearchDialogContext.Provider
          value={{ closeDialog, query: debouncedQuery }}
        >
          {debouncedQuery !== '' && <SearchResults data={data} />}
        </SearchDialogContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
