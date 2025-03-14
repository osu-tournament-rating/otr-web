'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { search } from '@/lib/actions/search';
import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import { DialogTitle } from '@radix-ui/react-dialog';
import { Search, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function SearchDialog() {
  const [searchText, setSearchText] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [data, setData] = useState<SearchResponseCollectionDTO>();
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const fetchData = async () => {
    // Dummy function to simulate API call
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

  useEffect(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (searchText) {
      const timeout = setTimeout(() => {
        fetchData();
      }, 800);
      setTypingTimeout(timeout);
    }
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
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
      {/* Required for screen reader support */}
      <DialogTitle hidden />
      <DialogContent>
        <div className="flex flex-row gap-3">
          <SearchIcon className="mt-1" />
          <Input
            className="mr-4"
            placeholder="Search"
            autoFocus
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
