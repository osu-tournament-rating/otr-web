import { ChartColumn } from 'lucide-react';

import { PageHeader } from '@/components/kit/layout/PageHeader';

/** The stats page's header, shared with its loading screen. */
export function StatsPageHeader() {
  return (
    <PageHeader
      icon={ChartColumn}
      title="Platform statistics"
      description="Statistics covering all of osu! tournaments"
    />
  );
}
