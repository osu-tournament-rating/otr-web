'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VerificationChildrenChoice } from '@/lib/orpc/schema/constants';

interface VerificationChildrenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (choice: VerificationChildrenChoice) => void;
}

export default function VerificationChildrenDialog({
  open,
  onOpenChange,
  onChoice,
}: VerificationChildrenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle>Apply to children</DialogTitle>
          <DialogDescription>
            Rejected children stay rejected unless you verify everything.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button onClick={() => onChoice('set')}>Verify all children</Button>
          <Button variant="secondary" onClick={() => onChoice('accept')}>
            Accept pre-statuses
          </Button>
          <Button variant="outline" onClick={() => onChoice('none')}>
            Leave children unchanged
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
