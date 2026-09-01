import { ORPCError } from '@orpc/client';
import { toast } from 'sonner';

export function saveToast() {
  toast.success('Saved');
}

export function errorSaveToast(error?: unknown) {
  const message =
    error instanceof ORPCError && error.code === 'BAD_REQUEST'
      ? error.message
      : 'Failed to save due to an unexpected issue.';

  toast.error(message);
}
