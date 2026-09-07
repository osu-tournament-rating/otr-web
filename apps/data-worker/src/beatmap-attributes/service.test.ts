import { expect, test } from 'bun:test';
import { isJobClaimable } from './service';
const now = new Date('2026-09-07T00:00:00Z');
const job = {
  status: 'pending',
  attempts: 0,
  leaseExpiresAt: null,
  nextAttemptAt: now.toISOString(),
};
test('duplicate deliveries cannot claim completed, active, failed or obsolete generations', () => {
  expect(isJobClaimable({ ...job, status: 'complete' }, 1, 1, now)).toBe(false);
  expect(isJobClaimable({ ...job, status: 'failed' }, 1, 1, now)).toBe(false);
  expect(
    isJobClaimable(
      {
        ...job,
        status: 'processing',
        leaseExpiresAt: new Date(now.getTime() + 1000).toISOString(),
      },
      1,
      1,
      now
    )
  ).toBe(false);
  expect(isJobClaimable(job, 2, 1, now)).toBe(false);
});
test('interrupted work recovers only after lease expiry and within retry budget', () => {
  expect(
    isJobClaimable(
      {
        ...job,
        status: 'processing',
        leaseExpiresAt: new Date(now.getTime() - 1).toISOString(),
      },
      1,
      1,
      now
    )
  ).toBe(true);
  expect(isJobClaimable({ ...job, attempts: 4 }, 1, 1, now)).toBe(false);
  expect(
    isJobClaimable(
      { ...job, nextAttemptAt: new Date(now.getTime() + 1000).toISOString() },
      1,
      1,
      now
    )
  ).toBe(false);
});
