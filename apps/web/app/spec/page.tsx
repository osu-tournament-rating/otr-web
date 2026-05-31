import Script from 'next/script';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScalarApiReference } from './ScalarApiReference';

export const metadata = {
  title: 'o!TR API Reference',
  description: 'Interactive documentation for public o!TR API endpoints.',
};

export default function SpecPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="space-y-4">
        <Alert
          data-testid="api-stability-notice"
          className="border-warning/50 bg-warning/10 text-warning-foreground dark:border-warning/40 dark:bg-warning/10 dark:text-yellow-100"
        >
          <AlertTriangle className="h-4 w-4 text-warning-foreground dark:text-yellow-300" />
          <AlertTitle className="font-semibold text-warning-foreground dark:text-yellow-300">
            API Stability Notice
          </AlertTitle>
          <AlertDescription className="text-warning-foreground/90 dark:text-yellow-100/90">
            The o!TR public API is still evolving and is not considered fully
            stable. Breaking changes may be introduced at any time without
            advance notice.
          </AlertDescription>
        </Alert>
        <div
          id="scalar-api-reference"
          data-testid="scalar-api-reference"
          className="w-full"
          style={{
            minHeight: 'calc(100vh - var(--header-height-px))',
          }}
        />
      </div>
      <ScalarApiReference />
      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
        strategy="afterInteractive"
      />
    </div>
  );
}
