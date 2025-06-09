'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { gameEditFormSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  GameDTO,
  GameWarningFlags,
  GameRejectionReason,
  Mods,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { EditIcon, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';
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
  GameProcessingStatusEnumHelper,
  GameWarningFlagsEnumHelper,
  getEnumFlags,
  ModsEnumHelper,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
  GameRejectionReasonEnumHelper,
} from '@/lib/enums';
import { MultipleSelect, Option } from '@/components/select/multiple-select';
import { update } from '@/lib/actions/games';
import { createPatchOperations } from '@/lib/utils/form';
import { errorSaveToast, saveToast } from '@/lib/utils/toasts';
import DeleteButton from '../shared/DeleteButton';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import RulesetSelectContent from '@/components/select/RulesetSelectContent';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

const modOptions = Object.entries(ModsEnumHelper.metadata)
  .filter(([, { text }]) => !!text)
  .map(([value, { text }]) => ({
    label: text,
    value,
  })) satisfies Option[];

const warningFlagOptions = Object.entries(
  GameWarningFlagsEnumHelper.metadata
).map(([value, { text }]) => ({
  label: text,
  value,
})) satisfies Option[];

const gameRejectionReasonOptions = Object.entries(
  GameRejectionReasonEnumHelper.metadata
).map(([value, { text }]) => ({
  label: text,
  value,
})) satisfies Option[];

export default function GameAdminView({ game }: { game: GameDTO }) {
  const form = useForm<z.infer<typeof gameEditFormSchema>>({
    resolver: zodResolver(gameEditFormSchema),
    defaultValues: game,
    mode: 'all',
  });

  const session = useSession();
  const router = useRouter();

  if (!session?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof gameEditFormSchema>) {
    try {
      const patchedGame = await update({
        id: game.id,
        body: createPatchOperations(game, values),
      });

      form.reset(patchedGame);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>Editing Game {game.id}</DialogDescription>
        </DialogHeader>
        {/* Edit form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isFreeMod"
              render={({ field: { value, onChange }, fieldState }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox
                      className={inputChangedStyle(fieldState)}
                      checked={value}
                      onCheckedChange={onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Free Mod</FormLabel>
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
                        enumHelper={GameProcessingStatusEnumHelper}
                      />
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
                  onClick={() => form.reset()}
                  disabled={
                    !form.formState.isDirty || form.formState.isSubmitting
                  }
                >
                  Reset
                </Button>

                {/* Delete game */}
                <DeleteButton
                  entityType="game"
                  entityId={game.id}
                  entityName={`Game ${game.id}`}
                  onDeleted={() => window.location.reload()}
                />
              </div>

              {/* Save changes */}
              <Button
                type="submit"
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
