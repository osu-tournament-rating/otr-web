import TournamentCard from '@/components/tournaments/TournamentCard';
import { tournaments } from '@/lib/api';
import type { Metadata } from 'next';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { result } = await tournaments.get({
    id: (await params).id,
    verified: false
  });

  return {
    title: result.name,
  };
}

export default async function Page({ params }: PageProps) {
  const { result } = await tournaments.get({
    id: (await params).id,
    verified: false,
  });

  return (
    <>
        <TournamentCard tournament={result} />
    </>
  );
}
