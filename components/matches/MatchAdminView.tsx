'use client';

import {
  getEnumFlags,
  MatchProcessingStatusEnumHelper,
  MatchWarningFlagsEnumHelper,
  ModsEnumHelper,
} from '@/lib/enums';
import { matchEditFormSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MatchCompactDTO,
  MatchWarningFlags,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { ControllerFieldState, useForm } from 'react-hook-form';
import { z } from 'zod';
import { MultipleSelect, Option } from '@/components/select/multiple-select';
import { useSession } from 'next-auth/react';
import { update } from '@/lib/actions/matches';
import { createPatchOperations } from '@/lib/utils/form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { EditIcon, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue } from '../ui/select';
import SimpleSelectContent from '../select/SimpleSelectContent';
import { Input } from '../ui/input';
import VerificationStatusSelectContent from '../select/VerificationStatusSelectContent';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

const warningFlagOptions = Object.entries(
  MatchWarningFlagsEnumHelper.metadata
).map(([value, { text }]) => ({
  label: text,
  value,
})) satisfies Option[];

export default function MatchAdminView({ match }: { match: MatchCompactDTO }) {
  const form = useForm<z.infer<typeof matchEditFormSchema>>({
    resolver: zodResolver(matchEditFormSchema),
    defaultValues: match,
    mode: 'all',
  });

  const { data: session } = useSession();
  if (!session?.user?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof matchEditFormSchema>) {
    try {
      const patchedMatch = await update({
        id: match.id,
        body: createPatchOperations(match, values),
      });

      form.reset(patchedMatch);
      toast.success('Saved successfully');
    } catch (error) {
      console.log(error);
      toast.error('Failed to save due to server issue');
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-5 w-5" variant={'ghost'}>
          <EditIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Match</DialogTitle>
          <DialogDescription>
            Editing <strong>{match.name}</strong>
          </DialogDescription>
        </DialogHeader>
        {/* Edit form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem className="flex-3">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      className={inputChangedStyle(fieldState)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warningFlags"
              render={({ field: { value, onChange }, fieldState }) => {
                const flags = getEnumFlags(value, MatchWarningFlags);

                return (
                  <FormItem>
                    <FormLabel>Warning Flags</FormLabel>
                    <MultipleSelect
                      className={inputChangedStyle(fieldState)}
                      placeholder={'No warnings'}
                      disabled
                      selected={flags.map(String)}
                      options={warningFlagOptions}
                      onChange={(values) => {
                        let flag = 0;
                        values.forEach((v) => {
                          flag |= Number(v);
                        });

                        onChange(flag);
                      }}
                    />
                  </FormItem>
                );
              }}
            />

            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="verificationStatus"
                render={({ field: { value, onChange }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Verification Status</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        onChange(Number(val));
                      }}
                      value={value.toString()}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger
                          className={inputChangedStyle(fieldState)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <VerificationStatusSelectContent />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="processingStatus"
                render={({ field: { value, onChange } }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Processing Status</FormLabel>
                    <Select
                      disabled
                      onValueChange={onChange}
                      value={value.toString()}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SimpleSelectContent
                        enumHelper={MatchProcessingStatusEnumHelper}
                      />
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Form action buttons */}
            <div className="flex justify-between">
              {/* Reset changes */}
              <Button
                type="reset"
                variant={'secondary'}
                onClick={() => form.reset()}
                disabled={
                  !form.formState.isDirty || form.formState.isSubmitting
                }
              >
                Reset
              </Button>
              {/* Save changes */}
              <Button
                type="submit"
                disabled={
                  !form.formState.isValid || !form.formState.isDirty
                }
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
