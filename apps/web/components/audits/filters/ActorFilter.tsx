'use client';

import { User, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ActorFilterProps {
  actorId?: number;
  onChange: (actorId: number | undefined) => void;
}

export default function ActorFilter({ actorId, onChange }: ActorFilterProps) {
  const [inputValue, setInputValue] = useState(actorId?.toString() ?? '');

  const handleApply = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <User className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="number"
          placeholder="User ID..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 pl-8"
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleApply}>
        Apply
      </Button>
      {actorId !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleClear}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
