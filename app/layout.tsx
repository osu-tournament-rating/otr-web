import Header from '@/components/header/Header';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import Footer from '@/components/footer/Footer';
import SessionProvider from '@/components/session-provider';
import { getSessionFromHeaders } from '@/lib/api/server';
import { TooltipProvider } from '@/components/ui/tooltip';
import { headers } from 'next/headers';

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
  const session = await getSessionFromHeaders(headersList);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-inter">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <TooltipProvider>
            <SessionProvider user={session}>
              <Header />
              <main className="mx-auto w-full max-w-[1050px] pb-5 sm:px-5 sm:py-10">
                {children}
              </main>
              <Footer />
              <Toaster richColors />
            </SessionProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
