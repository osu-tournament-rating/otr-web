'use client';

import NavBar from '@/components/NavBar/NavBar';
import Footer from '@/components/Footer/Footer';

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <NavBar />
      {children}
      <Footer />
    </>
  );
};
