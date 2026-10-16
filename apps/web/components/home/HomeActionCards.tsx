'use client';

import LinkCard, {
  HOME_CARD_CLASSES,
  HomeCardContent,
} from '@/components/home/LinkCard';
import { Panel } from '@/components/kit/layout/Panel';
import LoginButton from '@/components/profile/LoginButton';

interface HomeActionCardsProps {
  isLoggedIn: boolean;
  playerId: number | null;
}

export default function HomeActionCards({
  isLoggedIn,
  playerId,
}: HomeActionCardsProps) {
  return (
    <div
      data-testid="home-action-cards"
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {isLoggedIn && playerId ? (
        <LinkCard
          title="My profile"
          description="View your tournament stats and rating history"
          icon="user"
          href={`/players/${playerId}`}
        />
      ) : (
        <Panel
          as="div"
          data-testid="home-login-button"
          className={HOME_CARD_CLASSES}
        >
          <HomeCardContent
            title="My profile"
            description="Log in to view your profile"
            icon="user"
          >
            <LoginButton className="mt-2 self-start" />
          </HomeCardContent>
        </Panel>
      )}

      <LinkCard
        title="Browse tournaments"
        description="View the latest and greatest or go back in time"
        icon="trophy"
        href="/tournaments"
      />

      <LinkCard
        title="View rankings"
        description="Find out where you stack up against your friends... and foes"
        icon="medal"
        href="/leaderboard"
      />
    </div>
  );
}
