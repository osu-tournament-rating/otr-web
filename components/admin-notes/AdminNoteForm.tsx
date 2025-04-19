'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { createNote } from '@/lib/actions/admin-notes';
import { AdminNoteRouteTargetEnumHelper } from '@/lib/enums';
import { adminNoteFormSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminNoteRouteTarget,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export interface AdminNoteFormProps {
  /**
   * The unique identifier of the entity the note is associated with
   */
  entityId: number;

  /**
   * The type of entity the note is targeting
   */
  entity: AdminNoteRouteTarget;

  /**
   * Optional display name for the entity. Uses the entityId if not provided.
   */
  entityName?: string;
}

export default function AdminNoteForm({
  entityId,
  entity,
}: AdminNoteFormProps) {
  const form = useForm<z.infer<typeof adminNoteFormSchema>>({
    resolver: zodResolver(adminNoteFormSchema),
    defaultValues: {
      note: '',
    },
  });

  const { data: session } = useSession();
  const entityMetadata = AdminNoteRouteTargetEnumHelper.getMetadata(entity);

  if (!session?.user?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function onSubmit(data: z.infer<typeof adminNoteFormSchema>) {
    try {
      await createNote({
        entityId: entityId,
        entity: entity,
        body: data.note,
      });

      toast.success(
        `Created admin note for ${entityMetadata.text} ${entityId}`
      );
    } catch {
      toast.error(
        `Failed to create admin note for ${entityMetadata.text} ${entityId}`
      );
    }
  }

  return (
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
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
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
  );
}
