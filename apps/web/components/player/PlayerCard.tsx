import type { PlayerCompact } from '@/lib/orpc/schema/playerDashboard';
import { Ruleset } from '@/lib/osu/enums';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Link from 'next/link';
import { ExternalLink, User } from 'lucide-react';
import PlayerRulesetSelector from '../buttons/RulesetSelector';
import { Card } from '../ui/card';

interface PlayerCardProps {
  player: PlayerCompact;
  ruleset: Ruleset;
}

export default function PlayerCard({ player, ruleset }: PlayerCardProps) {
  return (
    <Card className="flex flex-row flex-wrap justify-between border-none bg-popover p-4">
      <div className="flex min-w-[250px] flex-1 items-center gap-3 rounded-lg">
        <Avatar className="h-16 w-16 bg-accent transition-all hover:border-primary/80">
          <AvatarImage
            src={`https://a.ppy.sh/${player.osuId}`}
            alt={player.username}
          />
          <AvatarFallback>
            <User className="h-16 w-16" />
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-medium">{player.username}</span>
          <Link
            href={`https://osu.ppy.sh/u/${player.osuId}`}
            target="_blank"
            aria-label="View profile on osu! website"
            className="flex translate-y-px items-center"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground/50" />
          </Link>
        </div>
      </div>
      <PlayerRulesetSelector defaultRuleset={ruleset} />
    </Card>
  );
}
