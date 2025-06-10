'use client';

import { useSession } from '@/lib/hooks/useSession';
import { update } from '@/lib/actions/tournaments';
import { tournamentEditFormSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { createPatchOperations } from '@/lib/utils/form';
import { errorSaveToast, saveToast } from '@/lib/utils/toasts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Roles,
  TournamentCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { EditIcon, Loader2 } from 'lucide-react';
import { ControllerFieldState, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';

import LobbySizeSelectContent from '../select/LobbySizeSelectContent';
import RulesetSelectContent from '../select/RulesetSelectContent';
import TournamentProcessingStatusSelectContent from '../select/TournamentProcessingStatusSelectContent';
import VerificationStatusSelectContent from '../select/VerificationStatusSelectContent';
import ResetAutomatedChecksButton from './ResetAutomatedChecksButton';
import DeleteButton from '../shared/DeleteButton';
import AcceptPreVerificationStatusesButton from './AcceptPreVerificationStatusesButton';
import DeleteTournamentBeatmapsButton from './DeleteTournamentBeatmapsButton';
import { MultipleSelect, Option } from '@/components/select/multiple-select';
import { getEnumFlags, TournamentRejectionReasonEnumHelper } from '@/lib/enums';
import { TournamentRejectionReason } from '@osu-tournament-rating/otr-api-client';

interface TournamentAdminViewProps {
  tournament: TournamentCompactDTO;
}

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

const tournamentRejectionReasonOptions = Object.entries(
  TournamentRejectionReasonEnumHelper.metadata
)
  .filter(([value]) => Number(value) !== TournamentRejectionReason.None)
  .map(([value, { text }]) => ({
    label: text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

export default function TournamentAdminView({
  tournament,
}: TournamentAdminViewProps) {
  const session = useSession();
  const router = useRouter();
  const form = useForm<z.infer<typeof tournamentEditFormSchema>>({
    resolver: zodResolver(tournamentEditFormSchema),
    defaultValues: tournament,
    mode: 'all',
  });

  if (!session?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  const handleSubmit = async (
    values: z.infer<typeof tournamentEditFormSchema>
  ) => {
    try {
      const patchedTournament = await update({
        id: tournament.id,
        body: createPatchOperations(tournament, values),
      });
      form.reset(patchedTournament);
      saveToast();
      router.refresh();
    } catch {
      errorSaveToast();
    }
  };

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
          <DialogTitle>
            <div className="flex items-center gap-2">
              Edit Tournament
              {/* Accept pre-verification statuses */}
              <AcceptPreVerificationStatusesButton tournament={tournament} />
            </div>
          </DialogTitle>
          <DialogDescription>Editing {tournament.name}</DialogDescription>
        </DialogHeader>
        {/* Edit form */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-3"
          >
            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Abbreviation</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="forumUrl"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Forum URL</FormLabel>
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

            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="ruleset"
                render={({ field: { onChange, value }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Ruleset</FormLabel>
                    <Select
                      onValueChange={(val) => onChange(Number(val))}
                      value={value.toString()}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger
                          className={inputChangedStyle(fieldState)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <RulesetSelectContent />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lobbySize"
                render={({ field: { onChange, value }, fieldState }) => {
                  return (
                    <FormItem className="flex-1">
                      <FormLabel>Format</FormLabel>
                      <Select
                        onValueChange={(val) => onChange(Number(val))}
                        value={value.toString()}
                      >
                        <FormControl className="w-full">
                          <SelectTrigger
                            className={inputChangedStyle(fieldState)}
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <LobbySizeSelectContent />
                      </Select>
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="rankRangeLowerBound"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Rank Restriction</FormLabel>
                    <FormControl className="w-full">
                      <Input
                        {...field}
                        min={1}
                        className={inputChangedStyle(fieldState)}
                        type={'number'}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rejectionReason"
              render={({ field: { value, onChange }, fieldState }) => {
                const flags = getEnumFlags(value, TournamentRejectionReason);

                return (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <MultipleSelect
                      className={inputChangedStyle(fieldState)}
                      placeholder={'No rejection reason'}
                      selected={flags.map(String)}
                      options={tournamentRejectionReasonOptions}
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
                      <TournamentProcessingStatusSelectContent />
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Form action buttons */}
            <div className="flex justify-between">
              <div className="flex gap-2">
                {/* Clear changes */}
                <Button
                  type="reset"
                  variant={'secondary'}
                  size="sm"
                  onClick={() => form.reset()}
                  disabled={
                    !form.formState.isDirty || form.formState.isSubmitting
                  }
                >
                  Clear
                </Button>
                {/* Reset automated checks */}
                <ResetAutomatedChecksButton tournament={tournament} />
                {/* Delete pooled beatmaps */}
                <DeleteTournamentBeatmapsButton tournament={tournament} />
                {/* Delete tournament */}
                <DeleteButton
                  entityType="tournament"
                  entityId={tournament.id}
                  entityName={tournament.name}
                  onDeleted={() => (window.location.href = '/tournaments')}
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
