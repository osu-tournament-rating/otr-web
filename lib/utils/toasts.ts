import { toast } from 'sonner';

export function saveToast() {
  toast.success('Saved');
}

export function errorSaveToast() {
  const message =
    'Failed to save due to an unexpected issue. Please check the console and report to the dev team!';
  toast.error(message);
}
