import { Lock } from 'lucide-react';
import type { Metadata } from 'next';

import { StatusPage } from '@/components/kit/feedback/StatusPage';

export const metadata: Metadata = {
  title: 'Unauthorized',
};

export default async function Page() {
  return (
    <StatusPage
      icon={Lock}
      title={<span data-testid="unauthorized-heading">Unauthorized</span>}
      description="You are not authorized to access this page."
      data-testid="unauthorized-container"
    />
  );
}
