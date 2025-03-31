'use client';

import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import LoginButton from '../buttons/LoginButton';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ProfileCardProps {
  isMobile?: boolean;
}

export default function ProfileCard({ isMobile = false }: ProfileCardProps) {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (session?.user?.player?.osuId) {
      const url = `https://a.ppy.sh/${session.user.player.osuId}`;
      setAvatarUrl(url);
      
      // Preload the image
      const img = new Image();
      img.src = url;
    }
  }, [session?.user?.player?.osuId]);

  if (!session) {
    return <LoginButton />;
  }

  const user = session.user;

  // Mobile version
  if (isMobile) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={user?.name || 'User avatar'} />
            <AvatarFallback>
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.player.username}</span>
            <span className="text-xs text-muted-foreground">{user?.scopes}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <Link 
            href={`/players/${user?.player.id}`}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </Link>
          
          <Link 
            href="/settings"
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
          
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="cursor-pointer"
        >
          <Avatar className="h-9 w-9 transition-all hover:border-primary/80">
            <AvatarImage src={avatarUrl} alt={user?.name || 'User avatar'} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-center text-sm leading-none text-muted-foreground">
              Welcome back, <span className="font-bold">{user?.player.username}</span>!
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/players/${user?.player.id}`}>
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
