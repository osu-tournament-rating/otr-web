'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Calendar, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function FilterComplianceNotice() {
  const [copied, setCopied] = useState(false);
  const [dateTimeString, setDateTimeString] = useState<string>('');

  useEffect(() => {
    // Generate date string on client side to avoid hydration mismatch
    const now = new Date();
    const utcDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const utcTime = now.toISOString().slice(11, 19); // HH:MM:SS
    setDateTimeString(`${utcDate} ${utcTime} UTC`);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dateTimeString);
      setCopied(true);
      toast.success('Date copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy date');
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* Compliance Warning */}
      <Alert className="border-warning/50 bg-warning/10 dark:border-warning/50 dark:bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning-foreground dark:text-yellow-400" />
        <AlertTitle className="text-warning-foreground font-bold dark:text-yellow-100">
          Host Compliance
        </AlertTitle>
        <AlertDescription className="text-warning-foreground/90 dark:text-yellow-100/90">
          <div className="mt-2 space-y-2">
            <p>
              <strong>
                You <span className='underline'>MUST</span> comply with the{' '}
                <Link className='underline text-primary' href="https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding">official tournament support filtering rules</Link>:
              </strong>
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Receive <strong>written permission</strong> from osu! support before using this tool.
              </li>
              <li>
                Include the filtering date/time on your tournament forum post
              </li>
              <li>Do not modify this filtering result.</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      {/* Date/Time Display */}
      <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong>Filtering performed at:</strong>
            </span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="font-mono text-sm font-medium">
                {dateTimeString || 'Loading...'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 w-7 flex-shrink-0 p-0"
                disabled={!dateTimeString}
                title="Copy date to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-sm">
            Copy this timestamp and include it in your tournament forum post.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
