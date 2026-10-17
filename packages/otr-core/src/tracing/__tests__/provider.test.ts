import { afterEach, describe, expect, it } from 'bun:test';

import { resolveServiceName } from '../provider';

describe('resolveServiceName', () => {
  const originalName = process.env.OTEL_SERVICE_NAME;

  afterEach(() => {
    if (originalName === undefined) {
      delete process.env.OTEL_SERVICE_NAME;
    } else {
      process.env.OTEL_SERVICE_NAME = originalName;
    }
  });

  it('uses OTEL_SERVICE_NAME when it is set', () => {
    process.env.OTEL_SERVICE_NAME = 'otr-web-preview';
    expect(resolveServiceName('otr-web')).toBe('otr-web-preview');
  });

  it.each(['', '   '])(
    'falls back to the service name when OTEL_SERVICE_NAME is %p',
    (name) => {
      process.env.OTEL_SERVICE_NAME = name;
      expect(resolveServiceName('otr-web')).toBe('otr-web');
    }
  );

  it('falls back to the service name when OTEL_SERVICE_NAME is unset', () => {
    delete process.env.OTEL_SERVICE_NAME;
    expect(resolveServiceName('otr-web')).toBe('otr-web');
  });
});
