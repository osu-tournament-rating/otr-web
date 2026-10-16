'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/kit/controls/Button';
import { Callout } from '@/components/kit/feedback/Callout';
import { toDate } from '@/lib/kit/format/date';

/**
 * The line hosts paste into their forum post. Its wording and format are
 * what hosts have always copied, so they never change.
 */
export function getForumPostText(filterReportId: number, created: string) {
  // Use the stored report timestamp, never the browser clock.
  const iso = (toDate(created) ?? new Date(created)).toISOString();
  const dateTime = `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
  return `o!TR Filtering performed at: ${dateTime} (Report ID: ${filterReportId})`;
}

/** The forum post text for a new filter report, with a copy button. */
export default function FilterComplianceNotice({
  filterReportId,
  created,
}: {
  filterReportId: number;
  /** Server-side creation timestamp of the report (`filter_reports.created`). */
  created: string;
}) {
  const [copied, setCopied] = useState(false);
  const forumPostString = getForumPostText(filterReportId, created);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(forumPostString);
      setCopied(true);
      toast.success('Forum post text copied to clipboard');
    } catch {
      toast.error('Forum post text could not be copied');
    }
  };

  return (
    <Callout
      tone="info"
      title="Forum post text"
      data-testid="filter-forum-post"
      action={
        <Button
          variant="outline"
          size="sm"
          icon={copied ? Check : Copy}
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      }
    >
      {/* Wraps at spaces, so the time never splits across lines. */}
      <code className="font-sans [overflow-wrap:anywhere]">
        {forumPostString}
      </code>
    </Callout>
  );
}
