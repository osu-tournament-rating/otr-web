'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Eye, Loader2, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ReportEntityTypeEnumHelper,
  ReportStatusEnumHelper,
} from '@/lib/enum-helpers';
import { orpc } from '@/lib/orpc/orpc';
import type { Report } from '@/lib/orpc/schema/report';
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

const formatFieldName = (field: string) => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const getLegacySuggestedChanges = (
  report: Pick<Report, 'reason' | 'suggestedChanges'>
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

export default function AdminReportsClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [resolving, setResolving] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const selectedLegacyChanges = selectedReport
    ? getLegacySuggestedChanges(selectedReport)
    : {};

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orpc.reports.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        pageSize: 100,
      });
      setReports(data.reports);
    } catch (error) {
      console.error('[admin-reports] failed to fetch reports', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    orpc.reports.markViewed({});
  }, []);

  const handleViewDetails = useCallback((report: Report) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote ?? '');
    setDetailsOpen(true);
  }, []);

  const handleResolve = useCallback(
    async (status: ReportStatus.Approved | ReportStatus.Rejected) => {
      if (!selectedReport) return;

      setResolving(true);
      try {
        await orpc.reports.resolve({
          reportId: selectedReport.id,
          status,
          adminNote: adminNote.trim() || undefined,
        });

        setReports((prev) =>
          prev.map((r) =>
            r.id === selectedReport.id
              ? { ...r, status, adminNote: adminNote.trim() || null }
              : r
          )
        );

        toast.success(
          `Report ${status === ReportStatus.Approved ? 'confirmed' : 'dismissed'}`
        );
        setDetailsOpen(false);
        setSelectedReport(null);
        setAdminNote('');
      } catch (error) {
        console.error('[admin-reports] failed to resolve report', error);
        toast.error('Failed to resolve report');
      } finally {
        setResolving(false);
      }
    },
    [selectedReport, adminNote]
  );

  const handleReopen = useCallback(async () => {
    if (!selectedReport) return;

    setReopening(true);
    try {
      await orpc.reports.reopen({
        reportId: selectedReport.id,
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? {
                ...r,
                status: ReportStatus.Pending,
                resolvedAt: null,
                resolvedBy: null,
              }
            : r
        )
      );

      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              status: ReportStatus.Pending,
              resolvedAt: null,
              resolvedBy: null,
            }
          : null
      );

      toast.success('Report reopened');
    } catch (error) {
      console.error('[admin-reports] failed to reopen report', error);
      toast.error('Failed to reopen report');
    } finally {
      setReopening(false);
    }
  }, [selectedReport]);

  const getStatusBadge = (status: ReportStatus) => {
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
  };

  return (
    <div className="space-y-6">
      <Card data-testid="admin-reports-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                User-submitted data issue reports
              </CardDescription>
            </div>
            <Select
              value={statusFilter === 'all' ? 'all' : String(statusFilter)}
              onValueChange={(value) =>
                setStatusFilter(
                  value === 'all' ? 'all' : (Number(value) as ReportStatus)
                )
              }
            >
              <SelectTrigger
                className="w-[180px]"
                data-testid="admin-reports-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value={String(ReportStatus.Pending)}>
                  Pending
                </SelectItem>
                <SelectItem value={String(ReportStatus.Approved)}>
                  Approved
                </SelectItem>
                <SelectItem value={String(ReportStatus.Rejected)}>
                  Rejected
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              data-testid="admin-reports-empty"
            >
              No reports found
            </p>
          ) : (
            <div
              className="overflow-x-auto rounded-lg border"
              data-testid="admin-reports-list"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      data-testid="admin-reports-row"
                      data-report-id={report.id}
                    >
                      <TableCell className="font-mono text-xs">
                        {report.id}
                      </TableCell>
                      <TableCell>
                        {
                          ReportEntityTypeEnumHelper.getMetadata(
                            report.entityType
                          ).text
                        }
                      </TableCell>
                      <TableCell>
                        <Link
                          href={getEntityLink(
                            report.entityType,
                            report.entityId,
                            report.matchId
                          )}
                          className="text-primary"
                          data-testid="admin-reports-entity-link"
                        >
                          #{report.entityId}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-48 font-medium">
                        {report.reason.label}
                      </TableCell>
                      <TableCell>
                        {report.reporter
                          ? (report.reporter.player.username ??
                            `User #${report.reporter.id}`)
                          : '[Deleted User]'}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(report.created)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(report)}
                          title="View details"
                          data-testid="admin-reports-view-details"
                        >
                          <Eye className="size-4" />
                        </Button>
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
          className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl"
          data-testid="admin-report-detail"
        >
          {selectedReport && (
            <>
              <DialogHeader className="border-b px-6 pt-6 pr-12 pb-5 text-left">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {getStatusBadge(selectedReport.status)}
                  <p className="text-sm text-muted-foreground">
                    Report #{selectedReport.id}
                  </p>
                </div>
                <DialogTitle className="text-xl leading-tight">
                  {selectedReport.reason.label}
                </DialogTitle>
                <DialogDescription className="leading-relaxed">
                  Submitted by{' '}
                  <span className="font-medium text-foreground">
                    {selectedReport.reporter
                      ? (selectedReport.reporter.player.username ??
                        `User #${selectedReport.reporter.id}`)
                      : '[Deleted User]'}
                  </span>{' '}
                  on {formatDateTime(selectedReport.created)}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[calc(90vh-9rem)] overflow-y-auto">
                <div className="space-y-6 px-6 py-5">
                  <section aria-labelledby="reported-item-heading">
                    <Label
                      id="reported-item-heading"
                      className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      Reported item
                    </Label>
                    <div className="mt-2 flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                      <div className="min-w-0">
                        <p className="font-medium [overflow-wrap:anywhere]">
                          {selectedReport.entityDisplayName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {
                            ReportEntityTypeEnumHelper.getMetadata(
                              selectedReport.entityType
                            ).text
                          }{' '}
                          #{selectedReport.entityId}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        asChild
                      >
                        <Link
                          href={getEntityLink(
                            selectedReport.entityType,
                            selectedReport.entityId,
                            selectedReport.matchId
                          )}
                        >
                          View
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </section>

                  <section aria-labelledby="reporter-note-heading">
                    <Label
                      id="reporter-note-heading"
                      className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      Reporter&apos;s note
                    </Label>
                    <p
                      className={cn(
                        'mt-2 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap',
                        !selectedReport.additionalInformation &&
                          'text-muted-foreground italic'
                      )}
                    >
                      {selectedReport.additionalInformation ||
                        'No additional information was provided.'}
                    </p>
                  </section>

                  {Object.keys(selectedLegacyChanges).length > 0 && (
                    <section className="rounded-lg border p-4">
                      <Label className="text-xs text-muted-foreground">
                        Legacy report details
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
                    </section>
                  )}
                </div>

                {selectedReport.status === ReportStatus.Pending ? (
                  <div className="border-t bg-muted/30 px-6 py-5">
                    <div>
                      <Label htmlFor="admin-note">Decision note</Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Optional context that will be visible to the reporter.
                      </p>
                      <Textarea
                        id="admin-note"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Explain your decision"
                        className="mt-3 bg-background"
                        rows={3}
                      />
                    </div>
                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleResolve(ReportStatus.Rejected)}
                        disabled={resolving}
                      >
                        {resolving ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <X className="mr-2 size-4" />
                        )}
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => handleResolve(ReportStatus.Approved)}
                        disabled={resolving}
                        className="bg-success text-success-foreground hover:bg-success/90"
                      >
                        {resolving ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 size-4" />
                        )}
                        Confirm report
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t bg-muted/30 px-6 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          Decision
                        </Label>
                        <p className="mt-1 text-sm">
                          {formatDateTime(selectedReport.resolvedAt)}
                          {selectedReport.resolvedBy?.player.username &&
                            ` by ${selectedReport.resolvedBy.player.username}`}
                        </p>
                        {selectedReport.adminNote && (
                          <p className="mt-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                            {selectedReport.adminNote}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleReopen}
                        disabled={reopening}
                        className="shrink-0"
                      >
                        {reopening ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 size-4" />
                        )}
                        Reopen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {!selectedReport && (
            <>
              <DialogHeader className="px-6 pt-6 pr-12 pb-5 text-left">
                <DialogTitle>Report details</DialogTitle>
                <DialogDescription>
                  Loading report information…
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 border-t px-6 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading report…
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
