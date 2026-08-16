const requestCache = new Map<string, Promise<unknown>>();

/** Shares an in-flight request under `key`, then evicts it `ttl` ms after it settles. */
export function withRequestCache<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = 5000
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)! as Promise<T>;
  }

  const request = requestFn().finally(() => {
    setTimeout(() => {
      requestCache.delete(key);
    }, ttl);
  });

  requestCache.set(key, request);
  return request;
}

/** Drops one cached request, or all of them when `key` is omitted. */
export function clearRequestCache(key?: string): void {
  if (key) {
    requestCache.delete(key);
  } else {
    requestCache.clear();
  }
}
