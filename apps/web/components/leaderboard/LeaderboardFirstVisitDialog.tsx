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
const COUNTDOWN_SECONDS = 5;

export default function LeaderboardFirstVisitDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const canDismiss = countdown <= 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEY)) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || canDismiss) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, canDismiss]);

  const handleDismiss = useCallback(() => {
    if (!canDismiss) return;
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  }, [canDismiss]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && canDismiss) {
          handleDismiss();
        }
      }}
    >
      <DialogContent
        closable={false}
        onEscapeKeyDown={(e) => {
          if (!canDismiss) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Welcome to the o!TR Leaderboard</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2 text-sm leading-relaxed">
              <p>
                Since this is your first time visiting the o!TR leaderboard,
                this is a cautionary message that o!TR ratings represent player
                performance in tournament matches rather than skill. Each player
                is assigned an initial rating based on their rank, and the
                accuracy of their rating gradually improves as they play more
                tournament matches.
              </p>
              <p>
                Thus, some players may appear higher than you expect on
                leaderboards if they perform very well in low-level tournaments
                below their skill level (often called &quot;deranking&quot; or
                &quot;sandbagging&quot;), or if they have a high rank in osu!
                but have not played in many tournaments. It may be useful to
                filter the leaderboard by global rank or number of matches if
                you would like more precise data.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={handleDismiss}
            disabled={!canDismiss}
            className="relative overflow-hidden"
          >
            <span
              className="bg-primary-foreground/20 absolute inset-0 origin-left"
              style={{
                transform: canDismiss ? 'scaleX(1)' : undefined,
                transition: canDismiss
                  ? undefined
                  : `transform ${COUNTDOWN_SECONDS}s linear`,
                transformOrigin: 'left',
              }}
              ref={(el) => {
                if (el && !canDismiss) {
                  // Trigger reflow to start the animation
                  el.getBoundingClientRect();
                  el.style.transform = 'scaleX(1)';
                }
              }}
            />
            <span className="relative z-10">
              {canDismiss
                ? 'I understand'
                : `I understand (${countdown}s)`}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
