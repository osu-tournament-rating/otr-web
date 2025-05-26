'use client';

import {
  AdminNoteDTO,
  AdminNoteRouteTarget,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createNote } from '@/lib/actions/admin-notes';
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

interface AdminNoteViewProps {
  /**
   * Admin notes
   */
  notes: AdminNoteDTO[];

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

  const form = useForm<z.infer<typeof adminNoteFormSchema>>({
    resolver: zodResolver(adminNoteFormSchema),
    defaultValues: {
      note: '',
    },
  });

  const [showNotification, setShowNotification] = useState(true);
  const notify = !!notes.length;

  if (!session?.scopes?.includes(Roles.Admin) && !notify) {
    return null;
  }

  const entityMetadata = AdminNoteRouteTargetEnumHelper.getMetadata(entity);
  entityDisplayName ??= `${entityMetadata.text} ${entityId}`;

  async function onSubmit(data: z.infer<typeof adminNoteFormSchema>) {
    try {
      await createNote({
        entityId: entityId,
        entity: entity,
        body: data.note,
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
            <div className="absolute -top-1 -right-1">
              <span className="relative flex h-3 w-3">
                <span className="absolute h-4/6 w-4/6 animate-ping rounded-full bg-warning duration-1500" />
                <span className="absolute h-4/6 w-4/6 rounded-full bg-warning-foreground" />
              </span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Notes</DialogTitle>
          <DialogDescription>
            Viewing admin notes for{' '}
            <span className="font-semibold">{entityDisplayName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* New note creation form */}
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
                      className="min-h-24 resize-none"
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
                disabled={!form.formState.isValid || !form.formState.isDirty}
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
        <AdminNotesList entity={entity} notes={notes} />
      </DialogContent>
    </Dialog>
  );
}
