'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Calendar, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface FilterComplianceNoticeProps {
  filterReportId: number;
  /** Server-side creation timestamp of the report (`filter_reports.created`). */
  created: string;
}

export default function FilterComplianceNotice({
  filterReportId,
  created,
}: FilterComplianceNoticeProps) {
  const [copied, setCopied] = useState(false);

  // Use the stored report timestamp, never the browser clock.
  const createdIso = new Date(created).toISOString();
  const dateTimeString = `${createdIso.slice(0, 10)} ${createdIso.slice(11, 19)} UTC`;
  const forumPostString = `o!TR Filtering performed at: ${dateTimeString} (Report ID: ${filterReportId})`;

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
      <Alert className="border-blue-500/50 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="font-bold text-blue-900 dark:text-blue-100">
          Filtering Information
        </AlertTitle>
        <AlertDescription className="text-blue-800/90 dark:text-blue-100/90">
          <div className="mt-2 space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Performed at</span>
                </div>
                <p className="font-mono text-sm font-medium">
                  {dateTimeString}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4" />
                  <span>Report ID</span>
                </div>
                <p className="font-mono text-sm font-medium">
                  #{filterReportId}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-blue-200 pt-3 dark:border-blue-800">
              <p className="text-sm font-medium">Forum post text</p>
              <div className="flex items-center gap-2 rounded-md bg-blue-100/50 p-3 dark:bg-blue-900/20">
                <code className="flex-1 text-xs break-all">
                  {forumPostString}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-8 w-8 flex-shrink-0"
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
        </AlertDescription>
      </Alert>
    </div>
  );
}
