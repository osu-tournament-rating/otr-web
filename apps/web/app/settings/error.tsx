'use client';

import RouteError from '@/components/error/RouteError';

export default function SettingsError({ retry }: { retry: () => void }) {
  return <RouteError title="Settings could not load" retry={retry} />;
}
