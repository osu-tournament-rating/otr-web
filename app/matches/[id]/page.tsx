import { get } from '@/lib/actions/matches';
import { Metadata } from 'next';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const match = await get({ id: (await params).id, verified: false });

  return { title: match.name };
}

export default async function Page({ params }: PageProps) {
  const match = await get({ id: (await params).id, verified: false });

  return <h1>{match.name}</h1>;
}
