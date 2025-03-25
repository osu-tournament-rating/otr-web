'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { search } from '@/lib/actions/search';
import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import { DialogTitle } from '@radix-ui/react-dialog';
import { Search, SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlayerSearchResultSection, {
  SearchResultData,
} from './SearchResultSection';

export default function SearchDialog() {
  const [searchText, setSearchText] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [data, setData] = useState<SearchResponseCollectionDTO | null>(null);
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
      setData(null);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [searchText]);

  return (
    <Dialog>
      <DialogTrigger asChild className="flex cursor-pointer">
        <Button className="cursor-pointer" variant="ghost" size="icon">
          <Search />
        </Button>
      </DialogTrigger>
      <DialogTitle hidden />
      <DialogContent className="fixed h-[80vh] max-h-[80vh] font-sans [&>button]:hidden">
        <div className="sticky top-0 z-10 flex flex-row gap-3 bg-background">
          <Input
            className="mr-4"
            placeholder="Search"
            autoFocus
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <SearchIcon className="mt-1" />
        </div>
        <div className="flex-col gap-5 overflow-y-scroll">
          <PlayerSearchResultSection
            data={data?.players}
          />
          {/* <SearchResultSection name="Tournaments" />
          <SearchResultSection name="Matches" /> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
