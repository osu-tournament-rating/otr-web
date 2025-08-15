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
  ScoreRejectionReason,
  AdminNoteRouteTarget,
} from '@osu-tournament-rating/otr-api-client';
import { EditIcon, Loader2, Trash2, UserRoundMinusIcon } from 'lucide-react';
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
  RulesetEnumHelper,
  TeamEnumHelper,
  ModsEnumHelper,
  ScoreGradeEnumHelper,
  ScoreRejectionReasonEnumHelper,
  getEnumFlags,
} from '@/lib/enums';
import { update } from '@/lib/actions/scores';
import { deletePlayerScores } from '@/lib/actions/matches';
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
import { createNote } from '@/lib/actions/admin-notes';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import AdminNotesList from '../admin-notes/AdminNoteList';
import DeleteButton from '../shared/DeleteButton';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import SimpleTooltip from '../simple-tooltip';

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

const scoreRejectionReasonOptions = Object.entries(
  ScoreRejectionReasonEnumHelper.metadata
)
  .filter(([value]) => Number(value) !== ScoreRejectionReason.None)
  .map(([value, { text }]) => ({
    label: text,
    value,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)) satisfies Option[];

export default function ScoreAdminView({ score }: { score: GameScoreDTO }) {
  const form = useForm<z.infer<typeof scoreEditFormSchema>>({
    resolver: zodResolver(scoreEditFormSchema),
    defaultValues: score,
    mode: 'all',
  });

  const session = useSession();
  const params = useParams();
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [showDeletePlayerScoresDialog, setShowDeletePlayerScoresDialog] =
    useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState<z.infer<
    typeof scoreEditFormSchema
  > | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const matchId = params?.id ? Number(params.id) : null;

  if (!session?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function handleDeletePlayerScores() {
    if (!matchId) {
      toast.error('Match ID not found');
      return;
    }

    setIsDeleting(true);
    try {
      const deletedCount = await deletePlayerScores(matchId, score.playerId);
      toast.success(
        `Deleted ${deletedCount} scores for player ${score.playerId}`
      );
      setShowDeletePlayerScoresDialog(false);
      router.refresh();
    } catch {
      toast.error('Failed to delete player scores');
    } finally {
      setIsDeleting(false);
    }
  }

  async function submitScorePatch(values: z.infer<typeof scoreEditFormSchema>) {
    try {
      const patchedScore = await update({
        id: score.id,
        body: createPatchOperations(score, values as GameScoreDTO),
      });

      toast.success('Saved score updates');

      if (adminNote !== '') {
        await createNote({
          entityId: score.id,
          entity: AdminNoteRouteTarget.GameScore,
          body: adminNote,
        });

        toast.success(`Saved admin note for score ${score.id}`);
      }

      // Reset forms
      form.reset(patchedScore);
      setAdminNote('');

      router.refresh();
    } catch {
      errorSaveToast();
    } finally {
      setShowNotePrompt(false);
      setPendingSubmit(null);
    }
  }

  async function handleSubmit(values: z.infer<typeof scoreEditFormSchema>) {
    // Check if any score-related fields were modified (excluding verification)
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
      'grade',
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
      await submitScorePatch(values);
    }
  }

  return (
    <>
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
            <DialogTitle>Edit Score</DialogTitle>
            <DialogDescription>Editing Score {score.id}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-3"
            >
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
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field: { value, onChange }, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Grade</FormLabel>
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
                        <SimpleSelectContent
                          enumHelper={ScoreGradeEnumHelper}
                        />
                      </Select>
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

              <div className="flex gap-5">
                <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field: { value, onChange }, fieldState }) => {
                    const flags = getEnumFlags(value, ScoreRejectionReason);

                    return (
                      <FormItem className="flex-1">
                        <FormLabel>Rejection Reason</FormLabel>
                        <MultipleSelect
                          className={inputChangedStyle(fieldState)}
                          placeholder={'No rejection reason'}
                          selected={flags.map(String)}
                          options={scoreRejectionReasonOptions}
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
                      <FormItem className="flex-1">
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
              </div>

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

              <div className="flex justify-between">
                <div className="flex gap-2">
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

                  {/* Delete score */}
                  <DeleteButton
                    entityType="score"
                    entityId={score.id}
                    entityName={`Score ${score.id}`}
                    onDeleted={() => window.location.reload()}
                  />

                  {/* Delete all player scores */}
                  <SimpleTooltip content="Delete All Player Scores">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => setShowDeletePlayerScoresDialog(true)}
                      disabled={!matchId}
                      className="h-8 w-8"
                    >
                      <UserRoundMinusIcon className="h-4 w-4" />
                    </Button>
                  </SimpleTooltip>
                </div>

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

      {/* Delete Player Scores Confirmation Dialog */}
      <AlertDialog
        open={showDeletePlayerScoresDialog}
        onOpenChange={setShowDeletePlayerScoresDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Player Scores</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all scores for player{' '}
              {score.playerId} in this match? This action cannot be undone and
              will remove all scores across all games in this match for this
              player.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlayerScores}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete All Scores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            className="min-h-16 resize-none"
          />
          <AdminNotesList
            entity={AdminNoteRouteTarget.GameScore}
            notes={score.adminNotes}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingSubmit && submitScorePatch(pendingSubmit)}
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
