'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'otr-leaderboard-first-visit-dismissed';

export default function LeaderboardFirstVisitDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEY)) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  }, []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleDismiss();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8">
            Welcome to the o!TR Leaderboard
          </DialogTitle>
          <DialogDescription>
            Ratings measure tournament match performance, not skill, so players
            may place higher or lower than you expect.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDismiss}>I understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
