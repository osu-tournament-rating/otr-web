'use client';

import { AdminNoteRouteTarget } from '@osu-tournament-rating/otr-api-client';
import { Loader2, StickyNote } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { AdminNoteRouteTargetEnumHelper } from '@/lib/enums';
import { adminNoteFormSchema } from '@/lib/schema';
import { hasAdminScope } from '@/lib/auth/roles';
import { orpc } from '@/lib/orpc/orpc';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '../ui/form';
import { Textarea } from '../ui/textarea';
import { z } from 'zod';
import AdminNotesList from './AdminNoteList';
import { useSession } from '@/lib/hooks/useSession';
import { AdminNote } from './types';

interface AdminNoteViewProps {
  /**
   * Admin notes
   */
  notes: AdminNote[];

  /**
   * Type of parent entity
   */
  entity: AdminNoteRouteTarget;

  /**
   * Id of the parent entity
   */
  entityId: number;

  /**
   * Optional display name for the parent entity. Uses entityId if not provided
   */
  entityDisplayName?: string;
}

export default function AdminNoteView({
  notes,
  entity,
  entityId,
  entityDisplayName,
}: AdminNoteViewProps) {
  const session = useSession();
  const router = useRouter();

  const isAdmin = hasAdminScope(session?.scopes ?? []);
  const isTournamentEntity = entity === AdminNoteRouteTarget.Tournament;
  const canMutate = isAdmin && isTournamentEntity;

  const form = useForm<z.infer<typeof adminNoteFormSchema>>({
    resolver: zodResolver(adminNoteFormSchema),
    defaultValues: {
      note: '',
    },
  });

  const [showNotification, setShowNotification] = useState(true);
  const notify = notes.length > 0;

  if (!isAdmin && !notify) {
    return null;
  }

  const entityMetadata = AdminNoteRouteTargetEnumHelper.getMetadata(entity);
  entityDisplayName ??= `${entityMetadata.text} ${entityId}`;

  async function onSubmit(data: z.infer<typeof adminNoteFormSchema>) {
    if (!canMutate) {
      toast.error('Admin notes for this entity are not yet available.');
      return;
    }

    try {
      await orpc.tournaments.adminNotes.create({
        tournamentId: entityId,
        note: data.note,
      });

      form.reset();
      toast.success(`Created admin note for ${entityDisplayName}`);
      router.refresh();
    } catch {
      toast.error(`Failed to create admin note for ${entityDisplayName}`);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            if (showNotification) {
              setShowNotification(false);
            }
          }}
          className="relative h-6 w-6 hover:bg-white/20 hover:text-white"
          variant={'ghost'}
          size="icon"
        >
          <StickyNote className="h-3 w-3 text-white/70 hover:text-white" />
          {showNotification && notify && (
            <div className="absolute -top-1 -right-1 z-50">
              <div className="h-2 w-2 rounded-full bg-yellow-600 dark:bg-yellow-400" />
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle>Admin Notes</DialogTitle>
          <DialogDescription>
            Viewing admin notes for{' '}
            <span className="font-semibold">{entityDisplayName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* New note creation form */}
        {canMutate && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Add your note here"
                        className="min-h-16 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between space-x-2">
                {/* Reset changes */}
                <Button
                  type="reset"
                  variant={'secondary'}
                  size="sm"
                  onClick={() => form.reset()}
                  disabled={
                    !form.formState.isDirty || form.formState.isSubmitting
                  }
                >
                  Discard
                </Button>
                {/* Save changes */}
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !form.formState.isValid ||
                    !form.formState.isDirty ||
                    form.formState.isSubmitting
                  }
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
        <AdminNotesList entity={entity} notes={notes} />
      </DialogContent>
    </Dialog>
  );
}
