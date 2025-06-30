import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function BetaWarningBanner() {
  return (
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 [&>svg]:text-yellow-600 [&>svg]:dark:text-yellow-500">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        This tool is available for beta testing only. It is not ready for use in
        officially-supported tournaments.
      </AlertDescription>
    </Alert>
  );
}
