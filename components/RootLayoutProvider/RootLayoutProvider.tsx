'use client';

import React from 'react';
import NavBar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';

export const RootLayoutProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <main>
      <NavBar />
      <div className={'container'}>
        {children}
      </div>
      <Footer />
    </main>
  );
};
