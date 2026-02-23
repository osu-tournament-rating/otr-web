'use client';

import {
  getEnumFlags,
  MatchWarningFlagsEnumHelper,
  MatchRejectionReasonEnumHelper,
} from '@/lib/enum-helpers';
import { matchEditFormSchema } from '@/lib/validation-schema';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ControllerFieldState, useForm } from 'react-hook-form';
import { z } from 'zod';
import { MultipleSelect, Option } from '@/components/select/multiple-select';
import { orpc } from '@/lib/orpc/orpc';
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
import { Input } from '../ui/input';
import VerificationStatusSelectContent from '../select/VerificationStatusSelectContent';

import { errorSaveToast, saveToast } from '@/lib/utils/toasts';
import { useSession } from '@/lib/hooks/useSession';
import { hasAdminScope } from '@/lib/auth/roles';
import { MatchRejectionReason, MatchWarningFlags } from '@otr/core/osu';
import type { MatchDetail } from '@/lib/orpc/schema/match';
import type { VerificationStatusValue } from '@/lib/orpc/schema/constants';
import DeleteButton from '../shared/DeleteButton';
import MergeMatchButton from './MergeMatchButton';
import { useRouter } from 'next/navigation';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

const warningFlagOptions = Object.entries(MatchWarningFlagsEnumHelper.metadata)
  .map(([value, { text }]) => ({
    label: text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

const matchRejectionReasonOptions = Object.entries(
  MatchRejectionReasonEnumHelper.metadata
)
  .filter(([value]) => Number(value) !== MatchRejectionReason.None)
  .map(([value, { text }]) => ({
    label: text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

type EditableMatch = Pick<
  MatchDetail,
  | 'id'
  | 'name'
  | 'verificationStatus'
  | 'rejectionReason'
  | 'warningFlags'
  | 'startTime'
  | 'endTime'
  | 'tournament'
>;

export default function MatchAdminView({ match }: { match: EditableMatch }) {
  const defaultValues = {
    name: match.name,
    verificationStatus: match.verificationStatus ?? 0,
    rejectionReason: match.rejectionReason ?? 0,
    warningFlags: match.warningFlags ?? 0,
    startTime: match.startTime ? new Date(match.startTime) : undefined,
    endTime: match.endTime ? new Date(match.endTime) : undefined,
  };

  const form = useForm<z.infer<typeof matchEditFormSchema>>({
    resolver: zodResolver(matchEditFormSchema),
    defaultValues,
    mode: 'all',
  });

  const session = useSession();
  const router = useRouter();

  const isAdmin = hasAdminScope(session?.scopes ?? []);

  if (!isAdmin) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof matchEditFormSchema>) {
    try {
      const startTimeInput =
        values.startTime ??
        (match.startTime ? new Date(match.startTime) : null);
      const endTimeInput =
        values.endTime ?? (match.endTime ? new Date(match.endTime) : null);
      const verificationStatus =
        values.verificationStatus as VerificationStatusValue;

      const toNullableISOString = (value: Date | null | undefined) =>
        value instanceof Date ? value.toISOString() : null;

      await orpc.matches.admin.update({
        id: match.id,
        name: values.name,
        verificationStatus,
        rejectionReason: values.rejectionReason,
        warningFlags: values.warningFlags,
        startTime: toNullableISOString(startTimeInput),
        endTime: toNullableISOString(endTimeInput),
      });

      saveToast();
      router.refresh();
    } catch {
      errorSaveToast();
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="h-6 w-6 hover:bg-white/20 hover:text-white"
          variant={'ghost'}
          size="icon"
        >
          <EditIcon className="h-3 w-3 text-white/70 hover:text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle>Edit Match</DialogTitle>
          <DialogDescription>
            Editing <strong>{match.name}</strong>
          </DialogDescription>
        </DialogHeader>
        {/* Edit form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
              name="rejectionReason"
              render={({ field: { value, onChange }, fieldState }) => {
                const flags = getEnumFlags(value, MatchRejectionReason);

                return (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <MultipleSelect
                      className={inputChangedStyle(fieldState)}
                      placeholder={'No rejection reason'}
                      selected={flags.map(String)}
                      options={matchRejectionReasonOptions}
                      onChange={(values: string[]) => {
                        let flag = 0;
                        values.forEach((v: string) => {
                          flag |= Number(v);
                        });

                        onChange(flag);
                      }}
                    />
                  </FormItem>
                );
              }}
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
                      onChange={(values: string[]) => {
                        let flag = 0;
                        values.forEach((v: string) => {
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
            </div>

            {/* Form action buttons */}
            <div className="flex justify-between">
              <div className="flex gap-2">
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
                  Reset
                </Button>

                {/* Merge match */}
                <MergeMatchButton match={{ id: match.id, name: match.name }} />

                {/* Delete match */}
                <DeleteButton
                  entityType="match"
                  entityId={match.id}
                  entityName={match.name}
                  onDeleted={() => {
                    const redirectTarget = match.tournament?.id
                      ? `/tournaments/${match.tournament.id}`
                      : '/tournaments';

                    router.replace(redirectTarget);
                    router.refresh();
                  }}
                />
              </div>

              {/* Save changes */}
              <Button
                type="submit"
                size="sm"
                disabled={!form.formState.isValid || !form.formState.isDirty}
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
