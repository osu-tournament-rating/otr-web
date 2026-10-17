'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function SettingsError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError title="Settings could not load" retry={retry} />
    </PageFrame>
  );
}
