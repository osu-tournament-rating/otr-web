type SearchParams = Record<string, string | string[] | undefined> | undefined;

const getParam = (
  searchParams: SearchParams,
  key: string
): string | undefined => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
};

const sanitizeText = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const formatExpiration = (value: string | null) => {
  if (!value) {
    return 'Indefinite';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Indefinite';
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

  return `${formatter.format(parsed)} UTC`;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function Page({ searchParams }: PageProps) {
  const reasonParam =
    getParam(searchParams, 'reason') ??
    getParam(searchParams, 'error_description');
  const sanitizedReason =
    sanitizeText(reasonParam) ?? 'No ban reason was provided.';

  const expiresParam = sanitizeText(getParam(searchParams, 'until'));
  const formattedExpiration = formatExpiration(expiresParam ?? null);

  return (
    <div className="rounded-4xl bg-card m-5 flex flex-col gap-4 p-10 text-center">
      <p className="text-primary font-mono text-4xl">Account Banned</p>
      <p className="text-accent-foreground font-mono">
        Your account is currently banned from osu! Tournament Rating.
      </p>

      <div className="text-accent-foreground mx-auto flex max-w-xl flex-col gap-2 text-left font-mono text-sm md:text-base">
        <p>
          <span className="text-muted-foreground/80">Ban reason:</span>{' '}
          {sanitizedReason}
        </p>
        <p>
          <span className="text-muted-foreground/80">Ban expires:</span>{' '}
          {formattedExpiration}
        </p>
      </div>

      <p className="text-muted-foreground font-mono text-xs md:text-sm">
        If you believe this is a mistake, please contact an administrator for
        further review.
      </p>
    </div>
  );
}
