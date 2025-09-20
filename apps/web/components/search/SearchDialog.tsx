'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { LoaderCircle, Search } from 'lucide-react';
import { useState, createContext, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import SearchResults from './SearchResults';
import { useSearch } from '@/lib/hooks/useSearch';
import { useDebounce } from '@uidotdev/usehooks';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSession } from '@/lib/hooks/useSession';

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
  const session = useSession();

  const handleSetQuery = (input: string) => {
    setQuery(input.trimStart());
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  // Clear search query when dialog opens to ensure clean search window
  useEffect(() => {
    if (isDialogOpen) {
      setQuery('');
    }
  }, [isDialogOpen]);

  // Clear search query when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setQuery('');
    }
  }, [isDialogOpen]);

  useHotkeys('CTRL+K', (e) => {
    e.preventDefault();
    setIsDialogOpen((prev) => !prev);
  });

  if (!session) {
    return null;
  }

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
      <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-[700px] flex-col gap-0 p-0 sm:w-[90vw] sm:min-w-[500px] md:min-w-[600px]">
        <div className="border-b bg-background p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="border-0 bg-background pr-10 pl-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-base"
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
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <SearchDialogContext.Provider
            value={{ closeDialog, query: debouncedQuery }}
          >
            {debouncedQuery !== '' ? (
              <SearchResults data={data} />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
                <div className="space-y-3 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/30 sm:h-10 sm:w-10" />
                  <p className="text-sm font-medium text-muted-foreground/70 sm:text-base">
                    Start typing to search
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
