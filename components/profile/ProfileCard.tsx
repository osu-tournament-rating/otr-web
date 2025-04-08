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
import { useState } from 'react';
import ProfileRoleBadge from './ProfileRoleBadge';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ProfileCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  if (!session) {
    return <LoginButton />;
  }

  return (
    <div>
      <div className="md:hidden relative mb-2 w-full overflow-hidden rounded-md">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 backdrop-blur-md" />
          <Image
            src={'/decorations/decoration-2.svg'}
            alt="background image"
            width={300}
            height={200}
            className="size-full object-cover"
          />
        </div>
        <div
          className="relative z-10 flex cursor-pointer items-center justify-between p-2"
          onClick={() => setIsOpen((prev) => !prev)}
          // onKeyDown={(e) => {
          //   if (e.key === 'Enter' || e.key === ' ') {
          //     e.preventDefault();
          //     setIsExpanded(!isExpanded);
          //   }
          // }}
        >
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage
                src={`https://a.ppy.sh/${session.user?.player.osuId}`}
                alt={
                  session.user?.player.username
                    ? `${session.user.player.username}'s avatar`
                    : 'User avatar'
                }
              />
              <AvatarFallback>
                <User className="size-3" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {session.user?.player.username}
              </span>
                {session.user?.scopes && (
                  <ProfileRoleBadge scopes={session.user?.scopes} />
                )}
            </div>
          </div>
          <ChevronDown
            className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
          />
        </div>
      </div>
      <div className="md:hidden block space-y-1 pl-11">
        <Link
          href={`/players/${session.user?.player.id}`}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
        >
          <User className="size-4" />
          <span>My Profile</span>
        </Link>

        <Link
          href="/settings"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
        >
          <Settings className="size-4" />
          <span>Settings</span>
        </Link>

        <button
          onClick={() => signOut()}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </button>
      </div>

      {/* Desktop */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild className="hidden md:block">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer focus:outline-none"
          >
            <Avatar className="size-9 transition-all hover:border-primary/80">
              <AvatarImage
                src={`https://a.ppy.sh/${session.user?.player.osuId}`}
                alt={
                  session.user?.player.username
                    ? `${session.user.player.username}'s avatar`
                    : 'User avatar'
                }
              />
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="mt-1 hidden w-56 md:block"
          sideOffset={0}
          alignOffset={0}
          forceMount
        >
          <DropdownMenuLabel className="relative overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-20">
              <div className="absolute inset-0 backdrop-blur-md" />
              <Image
                src={'/decorations/decoration-2.svg'}
                alt="background image"
                width={300}
                height={200}
                className="size-full object-cover"
              />
            </div>
            <div className="relative z-10 flex flex-col items-center py-1">
              <div className="flex items-center gap-2">
                <p className="text-sm leading-none">
                  <span className="font-bold">
                    {session.user?.player.username ?? 'Username'}
                  </span>
                </p>
                {session.user?.scopes && (
                  <ProfileRoleBadge scopes={session.user?.scopes} />
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Player page link */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={`/players/${session.user?.player.id}`}>
              <User className="mr-2 size-4" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          {/* Settings */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/settings">
              <Settings className="mr-2 size-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Log out */}
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // return (
  //   <>
  //     <div className="relative mb-2 w-full overflow-hidden rounded-md">
  //       <div className="absolute inset-0 z-0 opacity-20">
  //         <div className="absolute inset-0 backdrop-blur-md" />
  //         <Image
  //           src={'/decorations/decoration-2.svg'}
  //           alt="background image"
  //           width={300}
  //           height={200}
  //           className="h-full w-full object-cover"
  //         />
  //       </div>
  //       <div
  //         className="relative z-10 flex cursor-pointer items-center justify-between p-2"
  //         onClick={() => setIsExpanded(!isExpanded)}
  //         onKeyDown={(e) => {
  //           if (e.key === 'Enter' || e.key === ' ') {
  //             e.preventDefault();
  //             setIsExpanded(!isExpanded);
  //           }
  //         }}
  //         role="button"
  //         tabIndex={0}
  //         aria-expanded={isExpanded}
  //         aria-label="Toggle profile menu"
  //       >
  //         <div className="flex items-center gap-3">
  //           <Avatar className="h-8 w-8">
  //             <AvatarImage src={avatarUrl} alt={user?.name || 'User avatar'} />
  //             <AvatarFallback>
  //               <User className="size-3" />
  //             </AvatarFallback>
  //           </Avatar>
  //           <div className="flex items-center gap-2">
  //             <span className="text-sm font-medium">
  //               {user?.player.username}
  //             </span>
  //             {user?.scopes && <ProfileRoleBadge scopes={user.scopes} />}
  //           </div>
  //         </div>
  //         <ChevronDown
  //           className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
  //         />
  //       </div>
  //     </div>
  //     <div className="space-y-1 pl-11">
  //       <Link
  //         href={`/players/${user?.player.id}`}
  //         className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
  //       >
  //         <User className="size-4" />
  //         <span>My Profile</span>
  //       </Link>

  //       <Link
  //         href="/settings"
  //         className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
  //       >
  //         <Settings className="size-4" />
  //         <span>Settings</span>
  //       </Link>

  //       <button
  //         onClick={() => signOut()}
  //         className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
  //       >
  //         <LogOut className="size-4" />
  //         <span>Log out</span>
  //       </button>
  //     </div>
  //     {/* Desktop version */}
  //     <DropdownMenu open={open} onOpenChange={setOpen}>
  //       <DropdownMenuTrigger asChild>
  //         <motion.div
  //           whileHover={{ scale: 1.03 }}
  //           whileTap={{ scale: 0.97 }}
  //           className="cursor-pointer focus:outline-none"
  //           role="button"
  //           aria-label="Open profile menu"
  //         >
  //           {userAvatar}
  //         </motion.div>
  //       </DropdownMenuTrigger>
  //       <DropdownMenuContent
  //         align="end"
  //         className="mt-1 w-56"
  //         sideOffset={0}
  //         alignOffset={0}
  //         forceMount
  //       >
  //         <DropdownMenuLabel className="relative overflow-hidden">
  //           <div className="absolute inset-0 z-0 opacity-20">
  //             <div className="absolute inset-0 backdrop-blur-md" />
  //             <Image
  //               src={backgroundImageSrc}
  //               alt="background image"
  //               width={300}
  //               height={200}
  //               className="h-full w-full object-cover"
  //             />
  //           </div>
  //           <div className="relative z-10 flex flex-col items-center py-1">
  //             <div className="flex items-center gap-2">
  //               <p className="text-sm leading-none">
  //                 <span className="font-bold">{user?.player.username}</span>
  //               </p>
  //               {user?.scopes && <ProfileRoleBadge scopes={user.scopes} />}
  //             </div>
  //           </div>
  //         </DropdownMenuLabel>
  //         <DropdownMenuSeparator />
  //         <DropdownMenuItem asChild className="cursor-pointer">
  //           <Link href={`/players/${user?.player.id}`}>
  //             <User className="mr-2 size-4" />
  //             <span>My Profile</span>
  //           </Link>
  //         </DropdownMenuItem>
  //         <DropdownMenuItem asChild className="cursor-pointer">
  //           <Link href="/settings">
  //             <Settings className="mr-2 size-4" />
  //             <span>Settings</span>
  //           </Link>
  //         </DropdownMenuItem>
  //         <DropdownMenuSeparator />
  //         <DropdownMenuItem
  //           onClick={() => signOut()}
  //           className="cursor-pointer text-destructive focus:text-destructive"
  //         >
  //           <LogOut className="mr-2 size-4" />
  //           <span>Log out</span>
  //         </DropdownMenuItem>
  //       </DropdownMenuContent>
  //     </DropdownMenu>
  //   </>
  // );
}
