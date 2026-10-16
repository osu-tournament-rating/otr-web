'use client';

import { useCallback, useEffect, useId, useState } from 'react';

import { Button } from '@/components/kit/controls/Button';
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';

const STORAGE_KEY = 'otr-leaderboard-first-visit-dismissed';

/** Explains what ratings measure, once per browser. */
export default function LeaderboardFirstVisitDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const bodyId = useId();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
      }
    } catch {
      // Storage throws when the browser blocks site data. Without it the
      // dismissal can't stick, so skip the dialog rather than show it on
      // every visit.
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage is unavailable; closing still works for this visit.
    }
    setIsOpen(false);
  }, []);

  return (
    <DialogTemplate
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleDismiss();
        }
      }}
      title="Welcome to the o!TR leaderboard"
      size="sm"
      aria-describedby={bodyId}
      footer={<Button onClick={handleDismiss}>I understand</Button>}
    >
      <p id={bodyId} className="text-sm">
        Ratings measure tournament match performance, not skill, so players may
        place higher or lower than you expect.
      </p>
    </DialogTemplate>
  );
}
