import StagingBanner from '@/components/banner/StagingBanner';
import Header from '@/components/header/Header';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import Footer from '@/components/footer/Footer';
import SessionProvider from '@/components/session-provider';
import { AudioPlayerProvider } from '@/components/audio/AudioPlayerContext';
import AudioPlayerControls from '@/components/audio/AudioPlayerControls';
import { TooltipProvider } from '@/components/ui/tooltip';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { mapAppSessionToUser } from '@/lib/auth/session-utils';

export const metadata: Metadata = {
  title: {
    default: 'osu! Tournament Rating',
    template: '%s | o!TR',
  },
  description: 'The newest osu! tournament statistics platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const appSession = await auth.api.getSession({ headers: headersList });
  const session = mapAppSessionToUser(appSession);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-inter flex min-h-screen flex-col">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <TooltipProvider>
            <SessionProvider user={session}>
              <AudioPlayerProvider>
                <Header />
                <StagingBanner />
                <main className="mx-auto w-full max-w-[1050px] flex-1 pb-5 sm:px-5 sm:py-10">
                  {children}
                </main>
                <Footer />
                <Toaster richColors />
                <AudioPlayerControls />
              </AudioPlayerProvider>
            </SessionProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
