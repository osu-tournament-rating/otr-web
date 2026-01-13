import { Bot, User } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type AuditActor = {
  id: number;
  player: {
    id: number;
    osuId: number;
    username: string;
    country: string;
  } | null;
} | null;

export default function AuditActorBadge({ actor }: { actor: AuditActor }) {
  if (!actor || !actor.player) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="bg-muted">
            <Bot className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground text-sm font-medium">System</span>
      </div>
    );
  }

  return (
    <Link
      href={`/players/${actor.player.id}`}
      className="flex items-center gap-2 hover:underline"
    >
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarImage
          src={`https://a.ppy.sh/${actor.player.osuId}`}
          alt={`${actor.player.username}'s avatar`}
        />
        <AvatarFallback>
          <User className="h-3 w-3" />
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-semibold">{actor.player.username}</span>
    </Link>
  );
}
