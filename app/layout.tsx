import { RootLayoutProvider } from '@/components/RootLayoutProvider/RootLayoutProvider';
import ErrorProvider from '@/util/ErrorContext';
import UserProvider from '@/util/UserLoggedContext';
import type { Metadata } from 'next';
import { Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Inter } from 'next/font/google';
import './globals.css';
import React from 'react';
import { getSession } from '@/app/actions/session';

const inter = Inter({ subsets: ['latin'], variable: '--font-Inter' });

export const metadata: Metadata = {
  title: {
    default: 'osu! Tournament Rating',
    template: '%s | o!TR',
  },
  description: 'o!TR app.',
  keywords: [],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFFFFF',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSession();

  return (
    <html lang='en' className={inter.variable}>
      <body>
        <ThemeProvider defaultTheme='light' enableSystem={false}>
          <ErrorProvider>
            <UserProvider initialUser={user}>
              <RootLayoutProvider>
                {children}
              </RootLayoutProvider>
            </UserProvider>
          </ErrorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
