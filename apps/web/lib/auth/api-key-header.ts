import { ORPCError } from '@orpc/server';

export const extractApiKey = (headers: Headers): string | null => {
  const authorization = headers.get('authorization');
  if (authorization !== null) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    if (!match) {
      throw new ORPCError('UNAUTHORIZED', {
        message:
          'Provide the API key using the Authorization: Bearer <key> header.',
      });
    }
    return match[1];
  }

  const apiKey = headers.get('x-api-key');
  if (apiKey === null) return null;
  if (!apiKey.trim()) {
    throw new ORPCError('UNAUTHORIZED', { message: 'API key is missing.' });
  }
  return apiKey.trim();
};
