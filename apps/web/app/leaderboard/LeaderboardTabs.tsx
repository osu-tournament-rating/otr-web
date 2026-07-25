'use client';

import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeaderboardTabsProps {
  currentTab: 'all' | 'friends';
  allTabHref: string;
  friendsTabHref: string;
  hasFriends: boolean;
}

export default function LeaderboardTabs({
  currentTab,
  allTabHref,
  friendsTabHref,
  hasFriends,
}: LeaderboardTabsProps) {
  return (
    <Tabs value={currentTab} className="w-auto">
      <TabsList data-testid="leaderboard-tabs">
        <TabsTrigger value="all" asChild>
          <Link href={allTabHref} data-testid="leaderboard-tab-all">
            All
          </Link>
        </TabsTrigger>
        {hasFriends ? (
          <TabsTrigger value="friends" asChild>
            <Link href={friendsTabHref} data-testid="leaderboard-tab-friends">
              Friends
            </Link>
          </TabsTrigger>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <TabsTrigger
                  value="friends"
                  disabled
                  data-testid="leaderboard-tab-friends"
                >
                  Friends
                </TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent>Sync friends in settings to enable</TooltipContent>
          </Tooltip>
        )}
      </TabsList>
    </Tabs>
  );
}
