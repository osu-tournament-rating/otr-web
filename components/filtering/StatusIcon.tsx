import { CheckCircle, XCircle } from 'lucide-react';

interface StatusIconProps {
  isSuccess: boolean | undefined | null;
}

export default function StatusIcon({ isSuccess }: StatusIconProps) {
  return (
    <div className="flex items-center justify-center">
      {isSuccess ? (
        <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
      ) : (
        <XCircle className="size-5 text-red-600 dark:text-red-400" />
      )}
    </div>
  );
}
