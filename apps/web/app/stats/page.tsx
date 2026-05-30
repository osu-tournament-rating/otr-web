import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StatsPageContent from '@/components/stats/StatsPageContent';
import { orpc } from '@/lib/orpc/orpc';

export const metadata: Metadata = {
  title: 'Platform Statistics | o!TR',
  description: 'View platform-wide statistics and insights for o!TR',
};

export default async function StatsPage() {
  let stats: Awaited<ReturnType<typeof orpc.stats.platform>>;

  try {
    stats = await orpc.stats.platform();
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    return notFound();
  }

  if (!stats) {
    return notFound();
  }

  return <StatsPageContent stats={stats} />;
}
