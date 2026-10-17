'use client';

import { useEffect } from 'react';

import RouteError from '@/components/error/RouteError';
import './globals.css';

// Applies the theme that next-themes saved. Its provider can't be used here:
// this page renders on the client, where its inline script is rejected.
function useSavedTheme() {
  useEffect(() => {
    let theme: string | null = null;
    try {
      theme = window.localStorage.getItem('theme');
    } catch {
      // Storage can be unavailable.
    }

    const dark =
      theme === 'dark' ||
      (theme !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, []);
}

// Replaces the root layout when it fails, so it brings its own document,
// styles, and font.
export default function GlobalError({ retry }: { retry: () => void }) {
  useSavedTheme();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong | o!TR</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        {/* The root layout's frame, centring the error in the window. */}
        <main className="mx-auto flex w-full max-w-[1050px] flex-1 items-center px-4 pt-6 pb-10 sm:px-5 sm:pt-10">
          <RouteError title="o!TR could not load" retry={retry} />
        </main>
      </body>
    </html>
  );
}
