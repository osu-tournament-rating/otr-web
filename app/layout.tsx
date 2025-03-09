import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import Nav from '@/components/nav/Nav';
import { Toaster } from '@/components/ui/sonner';

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
  const session = await auth();
  console.log('root layout: auth');

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <SessionProvider basePath={'/auth'} session={session}>
            <Nav />
            <div className="flex justify-center w-full">
              <div className="max-w-3xl w-full m-auto mt-0 mb-0">
                {children}
              </div>
              <Toaster />
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
