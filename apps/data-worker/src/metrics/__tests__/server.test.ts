import { describe, expect, it } from 'bun:test';

import { resolveMetricsPort } from '../server';

describe('resolveMetricsPort', () => {
  it('uses METRICS_PORT when it is set', () => {
    expect(resolveMetricsPort('9100')).toBe(9100);
  });

  it.each([undefined, '', '   '])(
    'defaults to 9091 when METRICS_PORT is %p',
    (value) => {
      expect(resolveMetricsPort(value)).toBe(9091);
    }
  );
});
