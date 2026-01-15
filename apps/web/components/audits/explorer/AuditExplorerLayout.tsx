'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

import { useMediaQuery } from '@uidotdev/usehooks';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AuditExplorerLayoutProps {
  selectedId: number | null;
  onDeselect: () => void;
  table: ReactNode;
  panel: ReactNode;
  panelTitle?: string;
}

export default function AuditExplorerLayout({
  selectedId,
  onDeselect,
  table,
  panel,
  panelTitle,
}: AuditExplorerLayoutProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const hasSelection = selectedId !== null;

  if (isDesktop) {
    return (
      <div className="flex gap-4">
        <div
          className={`transition-all duration-300 ${hasSelection ? 'w-[60%]' : 'w-full'}`}
        >
          {table}
        </div>
        {hasSelection && (
          <div className="w-[40%] min-w-[400px]">
            <div className="bg-card sticky top-4 max-h-[calc(100vh-8rem)] overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="font-semibold">{panelTitle ?? 'Timeline'}</h2>
                <Button variant="ghost" size="icon" onClick={onDeselect}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[calc(100vh-12rem)] overflow-y-auto">
                {panel}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="w-full">{table}</div>
      <Sheet open={hasSelection} onOpenChange={(open) => !open && onDeselect()}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>{panelTitle ?? 'Timeline'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(80vh-6rem)] overflow-y-auto">
            {panel}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
