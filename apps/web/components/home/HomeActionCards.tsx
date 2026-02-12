'use client';

import LinkCard from '@/components/home/LinkCard';
import { Card } from '@/components/ui/card';
import LoginButton from '@/components/buttons/LoginButton';
import { User } from 'lucide-react';

interface HomeActionCardsProps {
  isLoggedIn: boolean;
  playerId: number | null;
}

export default function HomeActionCards({
  isLoggedIn,
  playerId,
}: HomeActionCardsProps) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-3">
      {isLoggedIn && playerId ? (
        <LinkCard
          title="My Profile"
          description="View your tournament stats and rating history"
          icon="user"
          href={`/players/${playerId}`}
        />
      ) : (
        <Card className="flex size-full flex-row items-center gap-4 border border-none p-6">
          <div className="text-primary mt-1">
            <User size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold">My Profile</h3>
            <p className="text-muted-foreground">
              Log in to view your profile
            </p>
            <LoginButton />
          </div>
        </Card>
      )}

      <LinkCard
        title="Browse Tournaments"
        description="View the latest and greatest or go back in time"
        icon="trophy"
        href="/tournaments"
      />

      <LinkCard
        title="View Rankings"
        description="Find out where you stack up against your friends... and foes"
        icon="medal"
        href="/leaderboard"
      />
    </div>
  );
}
