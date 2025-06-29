import { isProblemDetails } from '@/lib/api/shared';

export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isProblemDetails(error)) {
    return error.title || 'An error occurred';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}
