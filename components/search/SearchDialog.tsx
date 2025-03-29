'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { LoaderCircle, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import SearchResults from './SearchResults';
import { useSearch } from '@/lib/hooks/useSearch';
import { useDebounce } from 'use-debounce';

export default function SearchDialog() {
  const [query, setQuery] = useState('');
  const [value, { flush }] = useDebounce(query, 500);

  useEffect(() => {
    if (query === '') {
      setQuery('');
      flush();
    }
  }, [query, flush]);

  const { data, isLoading } = useSearch(value);

  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
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
  );
}
