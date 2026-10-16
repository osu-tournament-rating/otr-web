'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AdminNoteRouteTarget } from '@otr/core/osu';
import { NotebookPen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as React from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/kit/controls/Button';
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';
import { FormFieldLabel } from '@/components/kit/controls/FormFieldLabel';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { hasAdminScope } from '@/lib/auth/roles';
import { AdminNoteRouteTargetEnumHelper } from '@/lib/enum-helpers';
import { formatId } from '@/lib/kit/format/number';
import { useSession } from '@/lib/hooks/useSession';

import AdminNotesList from './AdminNoteList';
import { getAdminNoteMutations } from './adminNoteMutations';
import { AdminNote } from './types';

export const NOTE_REQUIRED_MESSAGE = 'Note is required';

const newNoteSchema = z.object({
  note: z.string().trim().min(1, NOTE_REQUIRED_MESSAGE),
});

type NewNote = z.infer<typeof newNoteSchema>;

export interface AdminNotesDialogProps {
  notes: AdminNote[];
  entity: AdminNoteRouteTarget;
  entityId: number;
  /** Falls back to the entity's type and ID, such as "Match 4012345". */
  entityDisplayName?: string;
  /** Controlled open state, for a dialog opened from an AdminMenu item. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The button that opens it. Leave it out when a menu item opens it. */
  trigger?: React.ReactElement;
}

/**
 * An entity's admin notes: the notes as rows, which their authors can edit
 * or delete, then a field and "Add note" for admins. Everyone else sees the
 * notes only.
 */
export function AdminNotesDialog({
  notes,
  entity,
  entityId,
  entityDisplayName,
  open: openProp,
  onOpenChange,
  trigger,
}: AdminNotesDialogProps) {
  const session = useSession();
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  const isAdmin = hasAdminScope(session?.scopes ?? []);
  const noteMutations = getAdminNoteMutations(entity);
  const canMutate = isAdmin && noteMutations != null;

  const form = useForm<NewNote>({
    resolver: zodResolver(newNoteSchema) as Resolver<NewNote>,
    defaultValues: { note: '' },
  });

  const name =
    entityDisplayName ??
    `${AdminNoteRouteTargetEnumHelper.getMetadata(entity).text} ${formatId(entityId)}`;
  const isSubmitting = form.formState.isSubmitting;

  const setOpen = (next: boolean) => {
    if (isSubmitting) return;
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  async function onSubmit(data: NewNote) {
    if (!noteMutations) return;

    try {
      await noteMutations.create(entityId, data.note);
      form.reset();
      toast.success(`Created admin note for ${name}`);
      router.refresh();
    } catch {
      toast.error(`Failed to create admin note for ${name}`);
    }
  }

  const body = (
    <>
      {notes.length > 0 ? (
        <AdminNotesList entity={entity} notes={notes} />
      ) : (
        <EmptyState
          size="compact"
          icon={NotebookPen}
          title="No admin notes yet"
        />
      )}
      {canMutate ? (
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="border-t pt-4">
              <FormFieldLabel>New note</FormFieldLabel>
              <FormControl>
                <Textarea
                  placeholder="Add your note here"
                  className="min-h-16"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );

  const dialogProps = {
    open,
    onOpenChange: setOpen,
    trigger,
    title: 'Admin notes',
    description: (
      <>
        Viewing admin notes for{' '}
        <span className="font-medium text-foreground">{name}</span>
      </>
    ),
    'data-testid': 'admin-notes-dialog',
    // Focus starts on the dialog itself, not on the first note's Edit
    // button, whose tooltip would otherwise cover the notes as it opens.
    // Tab then reaches the notes' actions and the new note field in order.
    // Radix leaves focus outside once its own autofocus is prevented, so
    // the dialog (focusable, tabIndex -1) takes it here.
    onOpenAutoFocus: (event: Event) => {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.focus({ preventScroll: true });
      }
    },
  };

  if (!canMutate) {
    return <DialogTemplate {...dialogProps}>{body}</DialogTemplate>;
  }

  return (
    <Form {...form}>
      <DialogTemplate
        {...dialogProps}
        onSubmit={form.handleSubmit(onSubmit)}
        footer={
          <>
            <Button
              variant="outline"
              disabled={!form.formState.isDirty || isSubmitting}
              onClick={() => form.reset()}
            >
              Discard
            </Button>
            <Button
              type="submit"
              pending={isSubmitting}
              disabled={!form.formState.isDirty}
            >
              Add note
            </Button>
          </>
        }
      >
        {body}
      </DialogTemplate>
    </Form>
  );
}
