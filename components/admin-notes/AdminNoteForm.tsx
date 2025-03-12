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
import { adminNoteFormSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export default function AdminNoteForm() {
  const form = useForm<z.infer<typeof adminNoteFormSchema>>({
    resolver: zodResolver(adminNoteFormSchema),
    defaultValues: {
      note: '',
    },
  });

  function onSubmit(data: z.infer<typeof adminNoteFormSchema>) {
    console.log(data);
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
        <div className="space-x-2">
          {/* Save changes */}
          <Button
            type="submit"
            disabled={
              !form.formState.isDirty ||
              (form.formState.isDirty && !form.formState.isValid)
            }
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Submit'
            )}
          </Button>
          {/* Reset changes */}
          <Button
            type="reset"
            variant={'secondary'}
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            Discard
          </Button>
        </div>
      </form>
    </Form>
  );
}
