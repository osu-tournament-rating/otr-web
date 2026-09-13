import { ORPCError } from '@orpc/server';
import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export const API_REQUEST_LOCK_POOL_SIZE = 10;

export const createApiRequestUnavailableError = () =>
  new ORPCError('SERVICE_UNAVAILABLE', {
    message: 'API request coordination is unavailable. Please try again later.',
  });
const overlappingRequest = () =>
  new ORPCError('TOO_MANY_REQUESTS', {
    message:
      'Another API request for this account is still processing. Wait for it to finish before trying again.',
  });

export class ApiRequestLock {
  private readonly owners = new Set<string>();

  constructor(
    private readonly pool: Pick<Pool, 'connect'>,
    private readonly capacity = API_REQUEST_LOCK_POOL_SIZE
  ) {}

  async run<T>(ownerId: string, operation: () => Promise<T>): Promise<T> {
    if (this.owners.has(ownerId)) throw overlappingRequest();
    if (this.owners.size >= this.capacity)
      throw createApiRequestUnavailableError();
    this.owners.add(ownerId);

    const lockId = createHash('sha256')
      .update(`otr:api-request:${ownerId}`)
      .digest()
      .readBigInt64BE()
      .toString();
    let client: PoolClient | undefined;
    let acquired = false;
    let failed = false;
    let result!: T;
    let operationFailed = false;
    let operationError: unknown;
    const onConnectionLoss = () => {
      failed = true;
    };

    try {
      try {
        client = await this.pool.connect();
        client.on('error', onConnectionLoss);
        client.on('end', onConnectionLoss);
        const result = await client.query<{ acquired: boolean }>(
          'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
          [lockId]
        );
        acquired = result.rows[0]?.acquired === true;
        if (failed) throw createApiRequestUnavailableError();
      } catch {
        failed = true;
        throw createApiRequestUnavailableError();
      }
      if (!acquired) throw overlappingRequest();

      // An aborted HTTP request may still be executing queries. Keep ownership
      // until the operation settles; a timeout must never admit overlapping work.
      result = await operation();
    } catch (error) {
      operationFailed = true;
      operationError = error;
    } finally {
      if (client) {
        if (acquired && !failed) {
          try {
            const result = await client.query<{ released: boolean }>(
              'SELECT pg_advisory_unlock($1::bigint) AS released',
              [lockId]
            );
            if (result.rows[0]?.released !== true) failed = true;
          } catch {
            failed = true;
          }
        }
        client.release(failed);
        client.removeListener('error', onConnectionLoss);
        client.removeListener('end', onConnectionLoss);
      }
      this.owners.delete(ownerId);
    }
    if (failed) throw createApiRequestUnavailableError();
    if (operationFailed) throw operationError;
    return result;
  }
}
