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
import { Input } from '@/components/ui/input';
import { scoreEditFormSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Roles,
  GameScoreDTO,
  Mods,
  AdminNoteRouteTarget,
} from '@osu-tournament-rating/otr-api-client';
import { EditIcon, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
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
  ScoreProcessingStatusEnumHelper,
  RulesetEnumHelper,
  TeamEnumHelper,
  ModsEnumHelper,
  getEnumFlags,
} from '@/lib/enums';
import { update } from '@/lib/actions/scores';
import { createPatchOperations } from '@/lib/utils/form';
import { errorSaveToast } from '@/lib/utils/toasts';
import { MultipleSelect, Option } from '@/components/select/multiple-select';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { create } from '@/lib/actions/admin-notes';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

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

export default function ScoreAdminView({ score }: { score: GameScoreDTO }) {
  const form = useForm<z.infer<typeof scoreEditFormSchema>>({
    resolver: zodResolver(scoreEditFormSchema),
    defaultValues: score,
    mode: 'all',
  });

  const { data: session } = useSession();
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState<z.infer<
    typeof scoreEditFormSchema
  > | null>(null);

  if (!session?.user?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function handleSubmitWithNote(
    values: z.infer<typeof scoreEditFormSchema>
  ) {
    try {
      console.log(createPatchOperations(score, values));
      const patchedScore = await update({
        id: score.id,
        body: createPatchOperations(score, values),
      });

      toast.success('Saved score updates');

      if (adminNote !== '') {
        await create({
          entityId: score.id,
          entity: AdminNoteRouteTarget.GameScore,
          body: adminNote,
        });

        toast.success(`Saved admin note for score ${score.id}`);
      }

      // Reset forms
      form.reset(patchedScore);
      setAdminNote('');
    } catch (error) {
      errorSaveToast();
      console.error('Failed to save patched score', error, values);
    } finally {
      setShowNotePrompt(false);
      setPendingSubmit(null);
    }
  }

  async function onSubmit(values: z.infer<typeof scoreEditFormSchema>) {
    // Check if any score-related fields were modified (excluding verification/processing status)
    const scoreFields = [
      'score',
      'accuracy',
      'maxCombo',
      'count300',
      'count100',
      'count50',
      'countMiss',
      'countGeki',
      'countKatu',
      'mods',
    ] as const;

    type ScoreField = (typeof scoreFields)[number];

    const isScoreModified = scoreFields.some(
      (field: ScoreField) =>
        JSON.stringify(values[field]) !== JSON.stringify(score[field])
    );

    if (isScoreModified) {
      setPendingSubmit(values);
      setShowNotePrompt(true);
    } else {
      await handleSubmitWithNote(values);
    }
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="h-5 w-5" variant={'ghost'}>
            <EditIcon />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Score</DialogTitle>
            <DialogDescription>Editing Score {score.id}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex gap-5">
                <FormField
                  control={form.control}
                  name="ruleset"
                  render={({ field: { value, onChange }, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Ruleset</FormLabel>
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
                        <SimpleSelectContent enumHelper={RulesetEnumHelper} />
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team"
                  render={({ field: { value, onChange }, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Team</FormLabel>
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
                        <SimpleSelectContent enumHelper={TeamEnumHelper} />
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-5">
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Score</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="placement"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Placement</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          disabled
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-5">
                <FormField
                  control={form.control}
                  name="accuracy"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Accuracy</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          step="any"
                          min={0}
                          max={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxCombo"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Max Combo</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-5">
                <FormField
                  control={form.control}
                  name="count300"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>300</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="count100"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>100</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="count50"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>50</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-5">
                <FormField
                  control={form.control}
                  name="countMiss"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Miss</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="countGeki"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Geki</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="countKatu"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Katu</FormLabel>
                      <FormControl>
                        <Input
                          className={inputChangedStyle(fieldState)}
                          type="number"
                          min={0}
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
                name="mods"
                render={({ field: { value, onChange }, fieldState }) => {
                  const flags = getEnumFlags(value, Mods);

                  return (
                    <FormItem>
                      <FormLabel>Mods</FormLabel>
                      <MultipleSelect
                        className={inputChangedStyle(fieldState)}
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
                          enumHelper={ScoreProcessingStatusEnumHelper}
                        />
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between">
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
                    'Save'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNotePrompt} onOpenChange={setShowNotePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin Note Required</AlertDialogTitle>
            <AlertDialogDescription>
              You are modifying sensitive values. Please provide a note
              explaining the reason for these changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Enter your reason for modifying this score..."
            className="min-h-24 resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingSubmit && handleSubmitWithNote(pendingSubmit)
              }
              disabled={!adminNote.trim()}
            >
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
