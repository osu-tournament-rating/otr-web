import { CheckCircle2, XCircle } from 'lucide-react';

interface StatusIconProps {
  isSuccess: boolean | undefined | null;
}

export default function StatusIcon({ isSuccess }: StatusIconProps) {
  return (
    <div className="flex items-center justify-center">
      {isSuccess ? (
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
      ) : (
        <XCircle className="size-4 text-red-600 dark:text-red-400" />
      )}
    </div>
  );
}
