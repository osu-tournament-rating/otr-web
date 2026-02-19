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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  tournamentSubmissionFormSchema,
  type TournamentSubmissionFormValues,
} from '@/lib/orpc/schema/tournamentSubmission';
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

const getFieldClassName = (hasError: boolean): string => {
  return `border-2 shadow-sm ${
    hasError
      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive'
      : 'border-input bg-card focus-visible:border-primary focus-visible:ring-primary'
  } focus-visible:ring-1`;
};

const getSelectFieldClassName = (hasError: boolean): string => {
  return `w-full border-2 shadow-sm ${
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive'
      : 'border-input bg-card focus:border-primary focus:ring-primary'
  } focus:ring-1`;
};

const getTextareaFieldClassName = (hasError: boolean): string => {
  return `field-sizing-fixed min-h-32 border-2 shadow-sm ${
    hasError
      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive'
      : 'border-input bg-card focus-visible:border-primary focus-visible:ring-primary'
  } focus-visible:ring-1`;
};

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
    defaultValues: {
      name: '',
      abbreviation: '',
      forumUrl: '',
      ruleset: undefined,
      rankRangeLowerBound: undefined,
      lobbySize: undefined,
      rejectionReason: TournamentRejectionReason.None,
      isLazer: false,
      ids: [],
      beatmapIds: [],
    },
  });

  const [rejectOnSubmit, setRejectOnSubmit] = useState(false);
  const [showBeatmapWarning, setShowBeatmapWarning] = useState(false);
  const [beatmapWarningConfirmed, setBeatmapWarningConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const performSubmit = async () => {
    form.clearErrors();

    const formValues = form.getValues();
    const validationResult =
      tournamentSubmissionFormSchema.safeParse(formValues);

    if (!validationResult.success) {
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (
          fieldName &&
          typeof fieldName === 'string' &&
          fieldName in formValues
        ) {
          form.setError(fieldName as keyof TournamentSubmissionFormValues, {
            type: 'validation',
            message: issue.message,
          });
        }
      });
      return;
    }

    const validatedData = validationResult.data;
    const beatmapIds = validatedData.beatmapIds;

    if (
      rejectOnSubmit &&
      validatedData.rejectionReason === TournamentRejectionReason.None
    ) {
      form.setError('rejectionReason', {
        message: 'Rejection reason must be selected when rejecting on submit',
      });
      return;
    }

    if (beatmapIds.length === 0 && !beatmapWarningConfirmed) {
      setShowBeatmapWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await orpc.tournaments.submit(validatedData);

      form.reset();
      setRejectOnSubmit(false);
      setBeatmapWarningConfirmed(false);

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await performSubmit();
  };

  return (
    <Card className="w-full overflow-hidden">
      <Form {...form}>
        <form
          onSubmit={handleFormSubmit}
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
                render={({ field, fieldState }) => (
                  <FormItem className="w-full sm:flex-1">
                    <LabelWithTooltip
                      label="Abbreviation"
                      tooltip="The prefix of each tournament lobby, such as 'OWC2024' from OWC2024: (United States) vs. (Canada)"
                    />
                    <FormControl>
                      <Input
                        placeholder="OWC2024"
                        {...field}
                        className={getFieldClassName(!!fieldState.error)}
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
                  <FormItem className="w-full sm:flex-1">
                    <LabelWithTooltip
                      label="Name"
                      tooltip="Full tournament name (e.g. osu! World Cup 2024)"
                    />
                    <FormControl>
                      <Input
                        placeholder="osu! World Cup 2024"
                        {...field}
                        className={getFieldClassName(!!fieldState.error)}
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
                  <LabelWithTooltip
                    label="Forum Post URL"
                    tooltip="Forum post URL or wiki page for the tournament"
                  />
                  <FormControl>
                    <Input
                      placeholder="https://osu.ppy.sh/community/forums/topics/..."
                      {...field}
                      className={getFieldClassName(!!fieldState.error)}
                      onChange={(e) => {
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
              render={({ field, fieldState }) => (
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
                      <SelectTrigger
                        className={getSelectFieldClassName(!!fieldState.error)}
                      >
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
              render={({ field, fieldState }) => (
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
                      <SelectTrigger
                        className={getSelectFieldClassName(!!fieldState.error)}
                      >
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
              render={({ field, fieldState }) => (
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
                      className={getFieldClassName(!!fieldState.error)}
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

          <div className="flex flex-row items-center gap-4">
            <FormField
              control={form.control}
              name="isLazer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <LabelWithTooltip
                    label="Played on osu!lazer"
                    tooltip="Check this if the tournament was played on osu!lazer instead of osu!stable"
                  />
                </FormItem>
              )}
            />

            {isAdmin && (
              <div className="flex flex-row items-center gap-2">
                <Checkbox
                  checked={rejectOnSubmit}
                  onClick={() => setRejectOnSubmit((prev) => !prev)}
                />
                <FormLabel className="text-foreground font-medium">
                  Reject this tournament on submission
                </FormLabel>
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
          </div>

          <FormSection
            icon={<Database className="text-primary h-6 w-6" />}
            title="Data"
          >
            <FormField
              control={form.control}
              name="ids"
              render={({ field, fieldState }) => {
                const isLazer = form.watch('isLazer');
                const placeholder = isLazer
                  ? `https://osu.ppy.sh/multiplayer/rooms/1537300\nhttps://osu.ppy.sh/multiplayer/rooms/2048512`
                  : `https://osu.ppy.sh/community/matches/12345\nhttps://osu.ppy.sh/mp/67890`;

                return (
                  <FormItem>
                    <LabelWithTooltip
                      label="Matches"
                      tooltip="osu! match IDs or URLs (one per line)"
                    />
                    <FormControl>
                      <Textarea
                        placeholder={placeholder}
                        value={
                          Array.isArray(field.value)
                            ? field.value.map(String).join('\n')
                            : ''
                        }
                        onChange={(e) =>
                          field.onChange(e.target.value.split('\n'))
                        }
                        className={getTextareaFieldClassName(
                          !!fieldState.error
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="beatmapIds"
              render={({ field, fieldState }) => (
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
                      className={getTextareaFieldClassName(!!fieldState.error)}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
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
                void performSubmit();
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
