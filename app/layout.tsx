import Footer from '@/components/Footer/Footer';
import { LayoutProvider } from '@/components/LayoutProvider/LayoutProvider';
import UserProvider from '@/util/UserLoggedContext';
import type { Metadata } from 'next';
import { Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <UserProvider>
          <LayoutProvider>
            {children}
            <Footer />
          </LayoutProvider>
        </UserProvider>
      </body>
    </html>
  );
}
