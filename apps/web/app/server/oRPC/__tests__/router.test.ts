import { describe, expect, it } from 'bun:test';

import { router } from '@/app/server/oRPC/router';

describe('router', () => {
  it('exposes no beatmap admin note routes', () => {
    expect('adminNotes' in router.beatmaps).toBe(false);
  });
});
