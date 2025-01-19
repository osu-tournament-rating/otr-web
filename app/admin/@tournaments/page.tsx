import TournamentsPage from '@/app/tournaments/page';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{}>;
}) {
  return (
    <div>
      <h1>Tournaments</h1>
      <TournamentsPage searchParams={searchParams} />
    </div>
  );
}