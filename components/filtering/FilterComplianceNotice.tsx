'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Calendar, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

interface FilterComplianceNoticeProps {
  filterReportId: number;
}

export default function FilterComplianceNotice({
  filterReportId,
}: FilterComplianceNoticeProps) {
  const [copied, setCopied] = useState(false);
  const [dateTimeString, setDateTimeString] = useState<string>('');
  const [forumPostString, setForumPostString] = useState<string>('');

  useEffect(() => {
    // Generate date string on client side to avoid hydration mismatch
    const now = new Date();
    const utcDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const utcTime = now.toISOString().slice(11, 19); // HH:MM:SS
    const dateTime = `${utcDate} ${utcTime} UTC`;
    setDateTimeString(dateTime);
    setForumPostString(
      `o!TR Filtering performed at: ${dateTime} (Report ID: ${filterReportId})`
    );
  }, [filterReportId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(forumPostString);
      setCopied(true);
      toast.success('Forum post text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy text');
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Compliance Warning */}
      <Alert className="border-warning/50 bg-warning/10 dark:border-warning/50 dark:bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning-foreground dark:text-yellow-400" />
        <AlertTitle className="font-bold text-warning-foreground dark:text-yellow-100">
          Host Compliance
        </AlertTitle>
        <AlertDescription className="text-warning-foreground/90 dark:text-yellow-100/90">
          <div className="mt-2 space-y-2">
            <p>
              <strong>
                You <span className="underline">MUST</span> comply with the{' '}
                <Link
                  className="text-primary underline"
                  href="https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding"
                >
                  official tournament support filtering rules
                </Link>
                :
              </strong>
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Receive <strong>written permission</strong> from osu! support
                before using this tool.
              </li>
              <li>
                Include the filtering date/time on your tournament forum post
              </li>
              <li>Do not modify this filtering result.</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      {/* Date/Time and Report ID Display */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <h4 className="text-base font-semibold">Filtering Information</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Performed at</span>
            </div>
            <p className="font-mono text-sm font-medium">
              {dateTimeString || 'Loading...'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Report ID</span>
            </div>
            <p className="font-mono text-sm font-medium">#{filterReportId}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Forum post text
          </p>
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
            <code className="flex-1 text-xs break-all">{forumPostString}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 flex-shrink-0"
              disabled={!forumPostString}
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
