import Header from '@/components/header/Header';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import React from 'react';
import './globals.css';
import Footer from '@/components/footer/Footer';
import SessionProvider from '@/components/session-provider';
import { getSession } from '@/lib/api/server';
import { TooltipProvider } from '@/components/ui/tooltip';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <TooltipProvider>
            <SessionProvider user={session}>
              <Header />
              <main className="mx-auto w-full md:w-[60%] pb-5 sm:px-5 sm:py-10 sm:pb-0 max-w-5xl">
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
