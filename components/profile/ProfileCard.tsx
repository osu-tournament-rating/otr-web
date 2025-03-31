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
import { ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import LoginButton from '../buttons/LoginButton';
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import ProfileRoleBadge from './ProfileRoleBadge';
import Image from 'next/image';

interface ProfileCardProps {
  isMobile?: boolean;
}

export default function ProfileCard({ isMobile = false }: ProfileCardProps) {
  // Custom hook for responsive design
  const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    
    useEffect(() => {
      // Return early if window is not defined (SSR)
      if (typeof window === 'undefined') return;
      
      const media = window.matchMedia(query);
      if (media.matches !== matches) setMatches(media.matches);
      
      const listener = () => setMatches(media.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, [matches, query]);
    
    return matches;
  };
  
  const isMobileView = useMediaQuery('(max-width: 767px)');
  const actualMobile = isMobile || isMobileView;
  const { data: session } = useSession();

  // State declarations
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isExpanded, setIsExpanded] = useState(false);

  const backgroundImageSrc = '/decorations/decoration-2.svg';

  // Handle window resize to close dropdown when switching to mobile view
  const handleResize = useCallback(() => {
    if (window.innerWidth < 768) {
      // 768px is the md breakpoint in Tailwind
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Handle avatar loading
  useEffect(() => {
    if (session?.user?.player?.osuId) {
      const url = `https://a.ppy.sh/${session.user.player.osuId}`;
      setAvatarUrl(url);
      // Next.js Image component handles optimization, no need for manual preloading
    }
  }, [session?.user?.player?.osuId]);

  // Memoize the avatar component to prevent unnecessary re-renders
  const userAvatar = useMemo(() => {
    if (!session?.user) return null;
    
    return (
      <Avatar className="h-9 w-9 transition-all hover:border-primary/80">
        <AvatarImage src={avatarUrl} alt={session.user?.name || 'User avatar'} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }, [avatarUrl, session?.user]);

  // Early return if no session
  if (!session) {
    return <LoginButton />;
  }

  const user = session.user;

  // Mobile version
  if (actualMobile) {
    return (
      <div className="w-full">
        <div className="relative mb-2 overflow-hidden rounded-md">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 backdrop-blur-md" />
            <Image
              src={backgroundImageSrc}
              alt="background image"
              width={300}
              height={200}
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className="relative z-10 flex cursor-pointer items-center justify-between p-2"
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-label="Toggle profile menu"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={avatarUrl}
                  alt={user?.name || 'User avatar'}
                />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {user?.player.username}
                </span>
                {user?.scopes && <ProfileRoleBadge scopes={user.scopes} />}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-1 pl-11">
            <Link
              href={`/players/${user?.player.id}`}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </Link>

            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Desktop version
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="cursor-pointer"
          role="button"
          aria-label="Open profile menu"
        >
          {userAvatar}
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="mt-1 w-56"
        sideOffset={0}
        alignOffset={0}
        forceMount
      >
        <DropdownMenuLabel className="relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 backdrop-blur-md" />
            <Image
              src={backgroundImageSrc}
              alt="background image"
              width={300}
              height={200}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative z-10 flex flex-col items-center py-1">
            <div className="flex items-center gap-2">
              <p className="text-sm leading-none">
                <span className="font-bold">{user?.player.username}</span>
              </p>
              {user?.scopes && <ProfileRoleBadge scopes={user.scopes} />}
            </div>
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
