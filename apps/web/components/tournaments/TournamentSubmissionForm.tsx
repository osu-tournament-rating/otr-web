'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Database, LoaderCircle, LinkIcon } from 'lucide-react';
import LabelWithTooltip from '../ui/LabelWithTooltip';
import { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  tournamentSubmissionFormSchema,
  type TournamentSubmissionFormValues,
} from '@/lib/orpc/schema/tournamentSubmission';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import LobbySizeSelectContent from '../select/LobbySizeSelectContent';
import RulesetSelectContent from '../select/RulesetSelectContent';
import { Select, SelectTrigger, SelectValue } from '../ui/select';
import { orpc } from '@/lib/orpc/orpc';
import { useSession } from '@/lib/hooks/useSession';
import { Checkbox } from '../ui/checkbox';
import { MultipleSelect } from '../select/multiple-select';
import { TournamentRejectionReasonEnumHelper } from '@/lib/enums';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { TournamentRejectionReason } from '@otr/core/osu';
import { hasAdminScope } from '@/lib/auth/roles';

// Form section component for better organization
type FormSectionProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

const FormSection = ({ icon, title, children }: FormSectionProps) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="border-border flex items-center gap-2 rounded-md border-b pb-2 sm:gap-3 sm:pb-3">
      {icon}
      <h3 className="text-foreground text-lg font-semibold sm:text-xl">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

export default function TournamentSubmissionForm() {
  const session = useSession();
  const isAdmin = hasAdminScope(session?.scopes ?? []);

  const form = useForm<TournamentSubmissionFormValues>({
    resolver: zodResolver(
      tournamentSubmissionFormSchema as unknown as z.ZodType<TournamentSubmissionFormValues>
    ),
    defaultValues: {
      name: '',
      abbreviation: '',
      forumUrl: '',
      ruleset: undefined,
      rankRangeLowerBound: undefined,
      lobbySize: undefined,
      rejectionReason: TournamentRejectionReason.None,
      ids: [],
      beatmapIds: [],
    },
    mode: 'onChange',
  });

  const [rejectOnSubmit, setRejectOnSubmit] = useState(false);
  const [showBeatmapWarning, setShowBeatmapWarning] = useState(false);
  const [beatmapWarningConfirmed, setBeatmapWarningConfirmed] = useState(false);

  async function onSubmit(values: TournamentSubmissionFormValues) {
    const beatmapIds = values.beatmapIds as number[];

    if (
      rejectOnSubmit &&
      values.rejectionReason === TournamentRejectionReason.None
    ) {
      form.setError('rejectionReason', {
        message: 'Rejection reason must be selected when rejecting on submit',
      });
      return;
    }

    // Check if beatmaps are missing and user hasn't confirmed
    if (beatmapIds.length === 0 && !beatmapWarningConfirmed) {
      setShowBeatmapWarning(true);
      return;
    }

    try {
      const result = await orpc.tournaments.submit(values);

      form.reset();
      setBeatmapWarningConfirmed(false); // Reset confirmation state

      result.warnings?.forEach((warning) => {
        toast.warning(warning);
      });

      toast.success(
        <div className="flex flex-col gap-2">
          <span>Tournament submitted successfully</span>
          <Link
            className="flex flex-row items-center gap-1"
            href={`/tournaments/${result.id}`}
          >
            <LinkIcon className="text-primary size-4" />
            <span className="text-primary">Click to view</span>
          </Link>
        </div>
      );
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      toast.error(errorMessage);
    }
  }

  return (
    <Card className="w-full overflow-hidden">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:space-y-8 lg:px-8"
        >
          <FormSection
            icon={<Trophy className="text-primary size-6" />}
            title="Information"
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field }) => (
                  <FormItem className="w-full sm:flex-1">
                    <LabelWithTooltip
                      label="Abbreviation"
                      tooltip="The prefix of each tournament lobby, such as 'OWC2024' from OWC2024: (United States) vs. (Canada)"
                    />
                    <FormControl>
                      <Input
                        placeholder="OWC2024"
                        {...field}
                        className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary border-2 shadow-sm focus-visible:ring-1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full sm:flex-1">
                    <LabelWithTooltip
                      label="Name"
                      tooltip="Full tournament name (e.g. osu! World Cup 2024)"
                    />
                    <FormControl>
                      <Input
                        placeholder="osu! World Cup 2024"
                        {...field}
                        className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary border-2 shadow-sm focus-visible:ring-1"
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
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Forum Post URL"
                    tooltip="Forum post URL or wiki page for the tournament"
                  />
                  <FormControl>
                    <Input
                      placeholder="https://osu.ppy.sh/community/forums/topics/..."
                      {...field}
                      className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary border-2 shadow-sm focus-visible:ring-1"
                      onChange={(e) => {
                        // Strip query parameters before setting value
                        const url = e.target.value;
                        const baseUrl = url.split('?')[0];
                        field.onChange(baseUrl);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="ruleset"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-1">
                  <LabelWithTooltip
                    label="Ruleset"
                    tooltip="Game mode the tournament is played in"
                  />
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString() || ''}
                  >
                    <FormControl>
                      <SelectTrigger className="border-input bg-card focus:border-primary focus:ring-primary w-full border-2 shadow-sm focus:ring-1">
                        <SelectValue placeholder="Select ruleset" />
                      </SelectTrigger>
                    </FormControl>
                    <RulesetSelectContent maniaOther={isAdmin} />
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lobbySize"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Lobby Size"
                    tooltip="Number of players per team in each match"
                  />
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString() || ''}
                  >
                    <FormControl>
                      <SelectTrigger className="border-input bg-card focus:border-primary focus:ring-primary w-full border-2 shadow-sm focus:ring-1">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <LobbySizeSelectContent />
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rankRangeLowerBound"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Rank Restriction"
                    tooltip="The 'best' global rank allowed to participate. Use 1 for open rank."
                  />
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Enter rank restriction"
                      className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary border-2 shadow-sm focus-visible:ring-1"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value =
                          e.target.value === ''
                            ? undefined
                            : e.target.valueAsNumber;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2">
                <Checkbox
                  checked={rejectOnSubmit}
                  onClick={() => setRejectOnSubmit((prev) => !prev)}
                />
                <label>Reject this tournament on submission</label>
              </div>
              {rejectOnSubmit && (
                <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({
                    field: { onChange, value },
                    fieldState: { invalid },
                  }) => (
                    <FormItem>
                      <FormControl>
                        <MultipleSelect
                          placeholder="Select rejection reason"
                          options={Object.entries(
                            TournamentRejectionReasonEnumHelper.metadata
                          )
                            .filter(
                              ([v]) =>
                                Number(v) !== TournamentRejectionReason.None
                            )
                            .map(([v, { text }]) => ({
                              value: v,
                              label: text,
                            }))}
                          selected={TournamentRejectionReasonEnumHelper.getFlags(
                            value
                          ).map(String)}
                          onChange={(values: string[]) => {
                            let flag = 0;
                            values.forEach((v: string) => {
                              flag |= Number(v);
                            });

                            onChange(flag);
                          }}
                          invalid={invalid}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          <FormSection
            icon={<Database className="text-primary h-6 w-6" />}
            title="Data"
          >
            {/* Matches */}
            <FormField
              control={form.control}
              name="ids"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Matches"
                    tooltip="osu! match IDs or URLs (one per line)"
                  />
                  <FormControl>
                    <Textarea
                      placeholder={`https://osu.ppy.sh/community/matches/12345\nhttps://osu.ppy.sh/mp/67890`}
                      value={
                        Array.isArray(field.value)
                          ? field.value.map(String).join('\n')
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value.split('\n'))
                      }
                      className="field-sizing-fixed border-input bg-card focus-visible:border-primary focus-visible:ring-primary min-h-32 border-2 shadow-sm focus-visible:ring-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Beatmap links */}
            <FormField
              control={form.control}
              name="beatmapIds"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Beatmaps"
                    tooltip="osu! beatmap IDs or URLs (one per line)"
                  />
                  <FormControl>
                    <Textarea
                      placeholder={`https://osu.ppy.sh/b/12345\nhttps://osu.ppy.sh/beatmapsets/123#osu/456`}
                      value={
                        Array.isArray(field.value)
                          ? field.value.map(String).join('\n')
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value.split('\n'))
                      }
                      className="field-sizing-fixed border-input bg-card focus-visible:border-primary focus-visible:ring-primary min-h-32 border-2 shadow-sm focus-visible:ring-1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <Button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md py-5 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:py-6 sm:text-lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              'Submit Tournament'
            )}
          </Button>
        </form>
      </Form>

      <AlertDialog
        open={showBeatmapWarning}
        onOpenChange={setShowBeatmapWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No beatmaps provided</AlertDialogTitle>
            <AlertDialogDescription>
              You are submitting a tournament without any beatmap links. This is
              strongly discouraged.
              <br />
              <br />
              Are you sure you want to continue without providing beatmap links?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowBeatmapWarning(false);
                setBeatmapWarningConfirmed(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setShowBeatmapWarning(false);
                setBeatmapWarningConfirmed(true);
                // Resubmit the form after confirmation
                form.handleSubmit(onSubmit)();
              }}
            >
              Continue without beatmaps
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeMessage =
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : undefined;

    const causeMessage = (() => {
      const cause = (error as { cause?: unknown }).cause;
      if (cause && typeof cause === 'object') {
        const message = (cause as { message?: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
      }
      return undefined;
    })();

    if (causeMessage) {
      return causeMessage;
    }

    if (maybeMessage) {
      return maybeMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to submit tournament. Please try again.';
}
