import { toast } from 'sonner';

export function saveToast() {
  toast.success('Saved');
}

export function errorSaveToast() {
  toast.error('Failed to save due to an unexpected issue.');
}
