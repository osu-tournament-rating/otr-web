'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { gameEditFormSchema } from '@/lib/validation-schema';
import { Game } from '@/lib/orpc/schema/match';
import { GameRejectionReason, GameWarningFlags, Mods } from '@otr/core/osu';
import { useSession } from '@/lib/hooks/useSession';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { EditIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ControllerFieldState, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import VerificationStatusSelectContent from '@/components/select/VerificationStatusSelectContent';
import SimpleSelectContent from '@/components/select/SimpleSelectContent';
import {
  GameRejectionReasonEnumHelper,
  GameWarningFlagsEnumHelper,
  ModsEnumHelper,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
  getEnumFlags,
} from '@/lib/enum-helpers';
import { MultipleSelect, Option } from '@/components/select/multiple-select';
import { orpc } from '@/lib/orpc/orpc';
import { errorSaveToast, saveToast } from '@/lib/utils/toasts';
import { hasAdminScope } from '@/lib/auth/roles';
import type { VerificationStatusValue } from '@/lib/orpc/schema/constants';
import DeleteButton from '../shared/DeleteButton';
import MergeGameButton from './MergeGameButton';
import { Checkbox } from '@/components/ui/checkbox';
import RulesetSelectContent from '@/components/select/RulesetSelectContent';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

const modOptions = Object.entries(ModsEnumHelper.metadata)
  .filter(([value, { text }]) => !!text && value !== Mods.None.toString())
  .map(([value, { text, description }]) => ({
    label: description
      ? `${description.charAt(0).toUpperCase() + description.slice(1)} (${text})`
      : text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

const warningFlagOptions = Object.entries(GameWarningFlagsEnumHelper.metadata)
  .map(([value, { text }]) => ({
    label: text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

const gameRejectionReasonOptions = Object.entries(
  GameRejectionReasonEnumHelper.metadata
)
  .filter(([value]) => Number(value) !== GameRejectionReason.None)
  .map(([value, { text }]) => ({
    label: text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

export default function GameAdminView({ game }: { game: Game }) {
  const defaultValues: z.infer<typeof gameEditFormSchema> = {
    ruleset: game.ruleset,
    mods: game.mods,
    verificationStatus: game.verificationStatus,
    rejectionReason: game.rejectionReason,
    scoringType: game.scoringType,
    teamType: game.teamType,
    warningFlags: game.warningFlags,
    isFreeMod: game.isFreeMod,
    startTime: game.startTime ? new Date(game.startTime) : undefined,
    endTime: game.endTime ? new Date(game.endTime) : undefined,
  };

  const form = useForm<z.infer<typeof gameEditFormSchema>>({
    resolver: zodResolver(gameEditFormSchema),
    defaultValues,
    mode: 'all',
  });

  const session = useSession();
  const router = useRouter();

  const isAdmin = hasAdminScope(session?.scopes ?? []);

  if (!isAdmin) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof gameEditFormSchema>) {
    try {
      const verificationStatus =
        values.verificationStatus as VerificationStatusValue;
      const startTimeIso = values.startTime
        ? values.startTime.toISOString()
        : (game.startTime ?? null);
      const endTimeIso = values.endTime
        ? values.endTime.toISOString()
        : (game.endTime ?? null);

      await orpc.games.admin.update({
        id: game.id,
        ruleset: values.ruleset,
        scoringType: values.scoringType,
        teamType: values.teamType,
        mods: values.mods,
        verificationStatus,
        rejectionReason: values.rejectionReason,
        warningFlags: values.warningFlags,
        startTime: startTimeIso,
        endTime: endTimeIso,
      });

      const nextStartTime =
        values.startTime ?? (startTimeIso ? new Date(startTimeIso) : undefined);
      const nextEndTime =
        values.endTime ?? (endTimeIso ? new Date(endTimeIso) : undefined);

      form.reset({
        ...values,
        startTime: nextStartTime,
        endTime: nextEndTime,
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
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>Editing Game {game.id}</DialogDescription>
        </DialogHeader>
        {/* Edit form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="scoringType"
                render={({ field: { value, onChange }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Scoring Type</FormLabel>
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
                      <SimpleSelectContent enumHelper={ScoringTypeEnumHelper} />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teamType"
                render={({ field: { value, onChange }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Team Type</FormLabel>
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
                      <SimpleSelectContent enumHelper={TeamTypeEnumHelper} />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ruleset"
                render={({ field: { value, onChange }, fieldState }) => (
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
            </div>

            <FormField
              control={form.control}
              name="isFreeMod"
              render={({ field: { value, onChange }, fieldState }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    {/* Disabled because this is a property set on the
                     DTO but isn't configurable or in the database */}
                    <Checkbox
                      disabled
                      className={inputChangedStyle(fieldState)}
                      checked={value}
                      onCheckedChange={onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-muted-foreground">
                      Free Mod
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rejectionReason"
              render={({ field: { value, onChange }, fieldState }) => {
                const flags = getEnumFlags(value, GameRejectionReason);

                return (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <MultipleSelect
                      className={inputChangedStyle(fieldState)}
                      placeholder={'No rejection reason'}
                      selected={flags.map(String)}
                      options={gameRejectionReasonOptions}
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
              name="mods"
              render={({ field: { value, onChange }, fieldState }) => {
                const flags = getEnumFlags(value, Mods);

                return (
                  <FormItem>
                    <FormLabel>Mods</FormLabel>
                    <MultipleSelect
                      className={inputChangedStyle(fieldState)}
                      placeholder={'No mods'}
                      selected={flags.map(String)}
                      options={modOptions}
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
                const flags = getEnumFlags(value, GameWarningFlags);

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

                {/* Merge game */}
                <MergeGameButton game={game} />

                {/* Delete game */}
                <DeleteButton
                  entityType="game"
                  entityId={game.id}
                  entityName={`Game ${game.id}`}
                  onDeleted={() => router.refresh()}
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
