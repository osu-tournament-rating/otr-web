export const revalidate = 60;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel',
};

export default async function Page() {
  return (
    <div>
      <h1>This is the admin page</h1>
      <p>some description here</p>
    </div>
  );
}
