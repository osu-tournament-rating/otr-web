/** Simple request cache to prevent duplicate API calls */
const requestCache = new Map<string, Promise<unknown>>();

/**
 * Fetches data using the provided function and caches the result.
 * If the same request is made before the cache expires, it returns the cached data.
 *
 * @template T - The type of data the request function will resolve to.
 * @param key - A unique key to identify this request in the cache.
 * @param requestFn - The function that makes the actual request. It should return a Promise.
 * @param ttl - How long to keep the result in cache, in milliseconds. Defaults to 5 seconds.
 * @returns A Promise that resolves with the data.
 */
export function withRequestCache<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = 5000
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)! as Promise<T>;
  }

  // Create new request and cache it
  const request = requestFn().finally(() => {
    // Remove from cache after TTL
    setTimeout(() => {
      requestCache.delete(key);
    }, ttl);
  });

  requestCache.set(key, request);
  return request;
}

/**
 * Clears items from the request cache.
 *
 * @param key - If provided, only the item with this key is removed. Otherwise, the entire cache is cleared.
 */
export function clearRequestCache(key?: string): void {
  if (key) {
    requestCache.delete(key);
  } else {
    requestCache.clear();
  }
}
