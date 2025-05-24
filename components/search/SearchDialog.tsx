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
  const debouncedQuery = useDebounce(query, 300);
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
      <DialogContent className="flex max-h-[85vh] max-w-[700px] min-w-[600px] flex-col gap-0 p-0">
        <div className="border-b bg-background p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="border-0 bg-background pr-10 pl-10 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Search players, tournaments, matches..."
              autoFocus
              value={query}
              onChange={(e) => handleSetQuery(e.target.value)}
              aria-label="Search query"
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
              {isLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
            </div>
          </div>
          {query && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Press</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                Esc
              </kbd>
              <span>to close</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <SearchDialogContext.Provider
            value={{ closeDialog, query: debouncedQuery }}
          >
            {debouncedQuery !== '' ? (
              <SearchResults data={data} />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="space-y-2 text-center">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Start typing to search
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Find players, tournaments, and matches
                  </p>
                </div>
              </div>
            )}
          </SearchDialogContext.Provider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
