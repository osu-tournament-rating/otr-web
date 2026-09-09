export function getSafeCallbackRedirect(redirectTo: string | null): string {
  if (
    !redirectTo?.startsWith('/') ||
    redirectTo.startsWith('//') ||
    /[\\\p{Cc}]/u.test(redirectTo)
  ) {
    return '/';
  }

  const destination = new URL(redirectTo, 'https://callback.invalid');

  // Dot segments can normalize a local path into a protocol-relative path.
  if (destination.pathname.startsWith('//')) {
    return '/';
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
