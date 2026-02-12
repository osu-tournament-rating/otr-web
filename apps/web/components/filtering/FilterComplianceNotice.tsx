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
        <AlertTriangle className="text-warning-foreground h-4 w-4 dark:text-yellow-400" />
        <AlertTitle className="text-warning-foreground font-bold dark:text-yellow-100">
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
                before using this tool in officially-supported tournaments.
              </li>
              <li>
                Include the filtering date/time on your tournament forum post
              </li>
              <li>Do not modify this filtering result.</li>
            </ol>
            <p>
              Make sure that the filter report is created shortly after
              registrations close (or whenever the filtering date is set),
              because ratings update each week on Tuesday at 12:00 UTC.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Additional Notes */}
      <Alert className="border-warning/50 bg-warning/10 dark:border-warning/50 dark:bg-warning/10">
        <Info className="text-warning-foreground h-4 w-4 dark:text-yellow-400" />
        <AlertTitle className="text-warning-foreground font-bold dark:text-yellow-100">
          Additional Notes
        </AlertTitle>
        <AlertDescription className="text-warning-foreground/90 dark:text-yellow-100/90">
          <div className="mt-2">
            <ul className="ml-4 list-disc space-y-2">
              <li>
                o!TR ratings represent <strong>performance</strong>, not skill.
                Using TR to filter players should be thought of as
                &quot;excluding sandbaggers&quot; rather than &quot;excluding the
                best players.&quot;
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>
                    Due to the smaller number of verified tournaments for
                    non-standard game modes, it is recommended to only use o!TR
                    filtering for osu! standard tournaments at this time.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Decide rating cutoffs before play begins.</strong>{' '}
                Include them in your forum post. Guidelines:
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>
                    See{' '}
                    <a
                      href="https://docs.otr.stagec.net/Rating-Framework/Rating-Calculation/Initial-Ratings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Initial Ratings
                    </a>{' '}
                    to understand how starting ratings are determined.
                  </li>
                  <li>
                    Example thresholds: ~1050 for rank range ~100k, ~1450 for
                    ~10k, ~1850 for ~1k.
                  </li>
                  <li>
                    Browse{' '}
                    <Link
                      href="/tournaments"
                      className="text-primary underline"
                    >
                      past tournaments
                    </Link>{' '}
                    to see what cutoffs other hosts have used.
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Date/Time and Report ID Display */}
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
                  {dateTimeString || 'Loading...'}
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
                <code className="flex-1 break-all text-xs">
                  {forumPostString}
                </code>
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
        </AlertDescription>
      </Alert>
    </div>
  );
}
