'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { search } from '@/lib/actions/search';
import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import { DialogTitle } from '@radix-ui/react-dialog';
import { Search, SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import SearchResults from './SearchResults';

export default function SearchDialog() {
  const [searchText, setSearchText] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [data, setData] = useState<SearchResponseCollectionDTO | undefined>(
    undefined
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const result = await search(searchText);
        setData(result);
      } catch {
        console.error('Error during search');
      } finally {
        setIsFetching(false);
      }
    };

    // Clear previous timeout on each keystroke
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout if searchText is not empty
    if (searchText) {
      typingTimeoutRef.current = setTimeout(() => {
        fetchData();
      }, 800);
    } else {
      // If the user clears the text field, clear the data
      setData(undefined);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [searchText]);

  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        <Button
          className="cursor-pointer"
          variant="ghost"
          size="icon"
          onClick={() => {
            setData(undefined);
            setSearchText('');
          }}
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
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <SearchIcon className="m-auto" />
        </div>
        <SearchResults input={searchText} data={data} />
      </DialogContent>
    </Dialog>
  );
}
