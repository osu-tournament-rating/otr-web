import { ShieldAlert } from 'lucide-react';
import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Suspended',
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
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-4 sm:pt-8">
      <div className="border-border bg-background space-y-6 rounded-2xl border px-6 py-8 text-center shadow-sm sm:px-10 sm:py-12">
        <div className="bg-destructive/10 text-destructive ring-destructive/30 mx-auto flex h-14 w-14 items-center justify-center rounded-full ring-1">
          <ShieldAlert aria-hidden="true" className="h-7 w-7" />
        </div>
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Account Suspended
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your osu! Tournament Rating account has been temporarily disabled.
            If you believe this is an error, please contact the administrators.
          </p>
        </header>
        {reason ? (
          <section className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-left text-sm sm:text-base">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-medium">Reason:</span>
              <span className="break-words">{reason}</span>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
