'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  ReportEntityTypeEnumHelper,
  ReportStatusEnumHelper,
} from '@/lib/enum-helpers';
import { orpc } from '@/lib/orpc/orpc';
import type { MyReport } from '@/lib/orpc/schema/report';
import { ReportEntityType, ReportStatus } from '@otr/core/osu';
import { cn } from '@/lib/utils';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return '—';
  return timestamp.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatFieldName = (field: string) =>
  field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

const getLegacySuggestedChanges = (
  report: Pick<MyReport, 'reason' | 'suggestedChanges'>
): Record<string, string> => {
  const changes = report.suggestedChanges as Record<string, string>;
  const entries = Object.entries(changes);

  if (
    entries.length === 1 &&
    entries[0]?.[0] === 'reason' &&
    entries[0][1] === report.reason.label
  ) {
    return {};
  }

  return changes;
};

function getEntityLink(
  entityType: ReportEntityType,
  entityId: number,
  matchId?: number
): string {
  switch (entityType) {
    case ReportEntityType.Tournament:
      return `/tournaments/${entityId}`;
    case ReportEntityType.Match:
      return `/matches/${entityId}`;
    case ReportEntityType.Game:
      return matchId ? `/matches/${matchId}?gameId=${entityId}` : '#';
    case ReportEntityType.Score:
      return matchId ? `/matches/${matchId}?scoreId=${entityId}` : '#';
    default:
      return '#';
  }
}

function getStatusBadge(status: ReportStatus) {
  const metadata = ReportStatusEnumHelper.getMetadata(status);
  return (
    <Badge
      variant={
        status === ReportStatus.Pending
          ? 'secondary'
          : status === ReportStatus.Approved
            ? 'default'
            : 'destructive'
      }
      className={cn(
        status === ReportStatus.Approved &&
          'bg-success text-success-foreground hover:bg-success/90'
      )}
    >
      {metadata.text}
    </Badge>
  );
}

export default function MyReportsClient() {
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<MyReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selectedLegacyChanges = selectedReport
    ? getLegacySuggestedChanges(selectedReport)
    : {};

  useEffect(() => {
    let active = true;
    orpc.reports
      .listMine({})
      .then((data) => {
        if (active) setReports(data.reports);
      })
      .catch((error) => {
        console.error('[my-reports] failed to fetch reports', error);
        toast.error('Failed to load your reports');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleViewDetails = useCallback((report: MyReport) => {
    setSelectedReport(report);
    setDetailsOpen(true);

    if (!report.hasUnreadUpdate) return;

    // Opening a report acknowledges the admin's update, clearing its indicator.
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id ? { ...r, hasUnreadUpdate: false } : r
      )
    );
    orpc.reports.markMineViewed({ reportId: report.id }).catch((error) => {
      console.error('[my-reports] failed to mark report viewed', error);
    });
  }, []);

  return (
    <div className="space-y-6">
      <Card data-testid="my-reports-card">
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            Data issues you&apos;ve reported and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading your reports...
            </div>
          ) : reports.length === 0 ? (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              data-testid="my-reports-empty"
            >
              You haven&apos;t submitted any reports.
            </p>
          ) : (
            <div
              className="overflow-x-auto rounded-lg border"
              data-testid="my-reports-list"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      data-testid="my-reports-row"
                      data-report-id={report.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`View report for ${report.entityDisplayName}`}
                      className="cursor-pointer"
                      onClick={() => handleViewDetails(report)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleViewDetails(report);
                        }
                      }}
                    >
                      <TableCell className="py-3">
                        {report.hasUnreadUpdate && (
                          <span
                            className="block size-2.5 rounded-full bg-blue-500"
                            data-testid="my-reports-unread-dot"
                            aria-label="Unread admin update"
                            title="Unread admin update"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {
                          ReportEntityTypeEnumHelper.getMetadata(
                            report.entityType
                          ).text
                        }
                      </TableCell>
                      <TableCell className="max-w-[20rem] truncate">
                        {report.entityDisplayName}
                      </TableCell>
                      <TableCell className="min-w-48 font-medium">
                        {report.reason.label}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(report.created)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
          data-testid="my-report-detail"
        >
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport &&
                ReportEntityTypeEnumHelper.getMetadata(
                  selectedReport.entityType
                ).text}{' '}
              • {selectedReport?.entityDisplayName}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Entity
                  </Label>
                  <p className="mt-1 text-sm">
                    <Link
                      href={getEntityLink(
                        selectedReport.entityType,
                        selectedReport.entityId,
                        selectedReport.matchId
                      )}
                      className="text-primary hover:underline"
                    >
                      {selectedReport.entityDisplayName}
                    </Link>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Submitted
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(selectedReport.created)}
                  </p>
                </div>
                {selectedReport.resolvedAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Reviewed
                    </Label>
                    <p className="text-sm">
                      {formatDateTime(selectedReport.resolvedAt)}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="mt-1 text-sm font-medium">
                  {selectedReport.reason.label}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Additional information
                </Label>
                <p className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm wrap-anywhere whitespace-pre-wrap">
                  {selectedReport.additionalInformation ||
                    'No additional information was provided.'}
                </p>
              </div>

              {Object.keys(selectedLegacyChanges).length > 0 && (
                <div className="rounded-lg border p-4">
                  <Label className="text-xs text-muted-foreground">
                    Original report details
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(selectedLegacyChanges).map((field) => (
                      <Badge key={field} variant="secondary">
                        {formatFieldName(field)}
                      </Badge>
                    ))}
                  </div>
                  {Object.values(selectedLegacyChanges).some(
                    (value) => value
                  ) && (
                    <p className="mt-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                      {Object.values(selectedLegacyChanges)[0] ?? '—'}
                    </p>
                  )}
                </div>
              )}

              {selectedReport.adminNote && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Admin Response
                  </Label>
                  <p className="mt-2 rounded-md bg-muted/50 p-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {selectedReport.adminNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
