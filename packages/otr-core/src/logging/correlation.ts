const hasRandomUUID = typeof crypto !== 'undefined' && 'randomUUID' in crypto;

export function generateCorrelationId(): string {
  if (hasRandomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function extractCorrelationId(headers: Headers): string | null {
  return headers.get('x-correlation-id') ?? headers.get('x-request-id');
}
