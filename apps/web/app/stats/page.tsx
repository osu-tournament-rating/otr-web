import { Metadata } from 'next';
import StatsPageContent from '@/components/stats/StatsPageContent';
import { orpc } from '@/lib/orpc/orpc';

export const metadata: Metadata = {
  title: 'Platform statistics',
  description: 'View platform-wide statistics and insights for o!TR',
};

export default async function StatsPage() {
  // A failure reaches the error screen; this page always exists.
  const stats = await orpc.stats.platform();

  return <StatsPageContent stats={stats} />;
}
