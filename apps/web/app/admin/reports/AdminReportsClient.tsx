'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Eye, Loader2, RotateCcw, X } from 'lucide-react';
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
            'bg-green-600 hover:bg-green-600/80'
        )}
      >
        {metadata.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
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
              <SelectTrigger className="w-[180px]">
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
            <div className="text-muted-foreground flex items-center gap-3 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No reports found
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
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
                        >
                          #{report.entityId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {report.reporter
                          ? (report.reporter.player.username ??
                            `User #${report.reporter.id}`)
                          : '[Deleted User]'}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDateTime(report.created)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(report)}
                          title="View details"
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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Report #{selectedReport?.id} •{' '}
              {selectedReport &&
                ReportEntityTypeEnumHelper.getMetadata(
                  selectedReport.entityType
                ).text}{' '}
              #{selectedReport?.entityId}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Reporter
                  </Label>
                  <p className="text-sm font-medium">
                    {selectedReport.reporter
                      ? (selectedReport.reporter.player.username ??
                        `User #${selectedReport.reporter.id}`)
                      : '[Deleted User]'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Status
                  </Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Created
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(selectedReport.created)}
                  </p>
                </div>
                {selectedReport.resolvedAt && (
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Resolved
                    </Label>
                    <p className="text-sm">
                      {formatDateTime(selectedReport.resolvedAt)}
                      {selectedReport.resolvedBy?.player.username &&
                        ` by ${selectedReport.resolvedBy.player.username}`}
                    </p>
                  </div>
                )}
              </div>

              {Object.keys(
                selectedReport.suggestedChanges as Record<string, string>
              ).length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Reported Fields
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(
                      selectedReport.suggestedChanges as Record<string, string>
                    ).map((field) => (
                      <Badge key={field} variant="secondary">
                        {formatFieldName(field)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {Object.values(
                selectedReport.suggestedChanges as Record<string, string>
              ).some((v) => v) && (
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Suggested Changes
                  </Label>
                  <p className="bg-muted/50 mt-2 whitespace-pre-wrap rounded-md p-3 text-sm">
                    {Object.values(
                      selectedReport.suggestedChanges as Record<string, string>
                    )[0] ?? '—'}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">
                  Justification
                </Label>
                <p className="bg-muted/50 mt-2 rounded-md p-3 text-sm">
                  {selectedReport.justification}
                </p>
              </div>

              {selectedReport.status === ReportStatus.Pending && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label htmlFor="admin-note">Admin Note (optional)</Label>
                    <Textarea
                      id="admin-note"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add a note about your decision"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
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
                      className="bg-green-600 hover:bg-green-600/90"
                    >
                      {resolving ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 size-4" />
                      )}
                      Confirm
                    </Button>
                  </div>
                </div>
              )}

              {selectedReport.status !== ReportStatus.Pending && (
                <div className="flex justify-end border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={handleReopen}
                    disabled={reopening}
                  >
                    {reopening ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 size-4" />
                    )}
                    Reopen
                  </Button>
                </div>
              )}

              {selectedReport.adminNote && (
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Admin Note
                  </Label>
                  <p className="bg-muted/50 mt-2 rounded-md p-3 text-sm">
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
