import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StatsPageContent from '@/components/stats/StatsPageContent';
import { orpc } from '@/lib/orpc/orpc';

export const metadata: Metadata = {
  title: 'Platform Statistics | o!TR',
  description: 'View platform-wide statistics and insights for o!TR',
};

export default async function StatsPage() {
  try {
    const stats = await orpc.stats.platform();

    if (!stats) {
      return notFound();
    }

    return <StatsPageContent stats={stats} />;
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    return notFound();
  }
}
