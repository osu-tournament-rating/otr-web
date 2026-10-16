import { ShieldAlert } from 'lucide-react';
import { type Metadata } from 'next';

import { StatusPage } from '@/components/kit/feedback/StatusPage';

export const metadata: Metadata = {
  title: 'Account suspended',
  description: 'Your osu! Tournament Rating account has been banned.',
};

type RawSearchParams = Record<string, string | string[] | undefined>;

type BannedPageProps = {
  searchParams?: Promise<RawSearchParams>;
};

const resolveSearchParams = async (
  searchParams: BannedPageProps['searchParams'] | RawSearchParams
): Promise<RawSearchParams> => {
  if (!searchParams) {
    return {};
  }

  if (typeof (searchParams as Promise<RawSearchParams>).then === 'function') {
    const resolved = await (searchParams as Promise<RawSearchParams>);
    return (resolved ?? {}) as RawSearchParams;
  }

  return searchParams as RawSearchParams;
};

const extractReason = (params: RawSearchParams): string | undefined => {
  const rawReason = params.reason;
  if (!rawReason) {
    return undefined;
  }
  return Array.isArray(rawReason) ? rawReason[0] : rawReason;
};

export default async function BannedPage(props: BannedPageProps) {
  const params = await resolveSearchParams(props.searchParams);
  const reason = extractReason(params);

  return (
    <StatusPage
      icon={ShieldAlert}
      tone="destructive"
      title={<span data-testid="banned-heading">Account suspended</span>}
      description="Your osu! Tournament Rating account has been temporarily disabled. If you believe this is an error, please contact the administrators."
    >
      {reason ? (
        <p className="break-words text-muted-foreground">
          <span className="font-medium text-foreground">Reason:</span>{' '}
          <span data-testid="banned-reason">{reason}</span>
        </p>
      ) : null}
    </StatusPage>
  );
}
