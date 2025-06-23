import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ListFilter } from 'lucide-react';

export default function FilteringResultsTableSkeleton() {
  return (
    <Card className="w-full overflow-hidden">
      <div className="p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="size-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Filtering Results
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </TableHead>
                <TableHead className="w-48 text-center">
                  <Skeleton className="mx-auto h-4 w-32" />
                </TableHead>
                <TableHead className="w-28 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead className="w-32 text-center">
                  <Skeleton className="mx-auto h-4 w-24" />
                </TableHead>
                <TableHead className="w-32 text-center">
                  <Skeleton className="mx-auto h-4 w-24" />
                </TableHead>
                <TableHead className="w-32 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </TableHead>
                <TableHead className="w-28 text-center">
                  <Skeleton className="mx-auto h-4 w-20" />
                </TableHead>
                <TableHead className="w-28 text-center">
                  <Skeleton className="mx-auto h-4 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-5 w-5 rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-6 w-24 rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-4 w-12" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-4 w-16" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-4 w-8" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-4 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
