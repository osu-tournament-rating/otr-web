export const revalidate = 60;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel',
};

export default async function Page() {
  // const tournamentsData = await fetchTournamentsForAdminPage(searchParams);
  // console.log(tournamentsData);

  return <h1>LANDING</h1>;
}
