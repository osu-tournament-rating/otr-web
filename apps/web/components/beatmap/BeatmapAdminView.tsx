'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ORPCError } from '@orpc/client';
import {
  Gauge,
  Info,
  Loader2,
  Music2,
  PencilLine,
  Shapes,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { z } from 'zod';

import { AuditEntityType, Ruleset } from '@otr/core/osu';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

import AuditButton from '@/components/audit/AuditButton';
import PlayerPicker from '@/components/beatmap/PlayerPicker';
import RulesetSelectContent from '@/components/select/RulesetSelectContent';
import SimpleTooltip from '@/components/simple-tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { hasAdminScope } from '@/lib/auth/roles';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';
import type { PlayerLookupResult } from '@/lib/orpc/schema/player';
import { formatDuration, parseDuration } from '@/lib/utils/date';
import { errorSaveToast, saveToast } from '@/lib/utils/toasts';

const required = z.string().trim().min(1, 'Required');

const decimal = (max: number) =>
  required.refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max;
  }, `Enter a number from 0 to ${max}`);

const count = required.refine((value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}, 'Enter a whole number, 0 or more');

const duration = required.refine((value) => {
  const seconds = parseDuration(value);
  return seconds !== null && seconds <= 86_400;
}, 'Enter a length as [h:]mm:ss');

export const formSchema = z.object({
  diffName: required,
  ruleset: z.string(),
  sr: decimal(100),
  bpm: decimal(10_000),
  totalLength: duration,
  drainLength: duration,
  cs: decimal(10),
  hp: decimal(20),
  od: decimal(20),
  ar: decimal(20),
  countCircle: count,
  countSlider: count,
  countSpinner: count,
  maxCombo: z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') return true;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1;
    }, 'Enter a whole number, 1 or more'),
  titleOverride: z.string().trim().max(512),
  artistOverride: z.string().trim().max(512),
});

type FormValues = z.input<typeof formSchema>;

type FooterMode = 'edit' | 'confirm';

export function fieldErrors(error: unknown) {
  if (!(error instanceof ORPCError)) {
    return [];
  }

  const issues = (error.data as { issues?: unknown })?.issues;
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.flatMap((issue) => {
    const first = issue?.path?.[0];
    const name =
      typeof first === 'object' && first !== null ? first.key : first;

    return typeof name === 'string' &&
      name in formSchema.shape &&
      typeof issue?.message === 'string'
      ? [{ name: name as keyof FormValues, message: issue.message as string }]
      : [];
  });
}

export function sameOsuIds(
  a: readonly PlayerLookupResult[],
  b: readonly PlayerLookupResult[]
) {
  return (
    a.length === b.length &&
    a.every((player, index) => player.osuId === b[index].osuId)
  );
}

const toPlayer = (player: {
  id: number;
  osuId: number;
  username: string;
}): PlayerLookupResult => ({
  osuId: player.osuId,
  username: player.username,
  playerId: player.id,
});

export default function BeatmapAdminView({
  beatmap,
}: {
  beatmap: BeatmapWithDetails;
}) {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FooterMode>('edit');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const inFlight = useRef(false);

  const owner = beatmap.setOwnerOverride ?? beatmap.beatmapset?.creator;
  const initialOwner = owner ? [toPlayer(owner)] : [];
  const initialMappers = beatmap.creators.map(toPlayer);

  const defaultValues: FormValues = {
    diffName: beatmap.diffName,
    ruleset: String(beatmap.ruleset),
    sr: String(beatmap.sr),
    bpm: String(beatmap.bpm),
    totalLength: formatDuration(Number(beatmap.totalLength)),
    drainLength: formatDuration(Number(beatmap.drainLength)),
    cs: String(beatmap.cs),
    hp: String(beatmap.hp),
    od: String(beatmap.od),
    ar: String(beatmap.ar),
    countCircle: String(beatmap.countCircle),
    countSlider: String(beatmap.countSlider),
    countSpinner: String(beatmap.countSpinner),
    maxCombo: beatmap.maxCombo ? String(beatmap.maxCombo) : '',
    titleOverride: beatmap.titleOverride ?? beatmap.beatmapset?.title ?? '',
    artistOverride: beatmap.artistOverride ?? beatmap.beatmapset?.artist ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const [setOwner, setSetOwner] = useState<PlayerLookupResult[]>(initialOwner);
  const [mappers, setMappers] = useState<PlayerLookupResult[]>(initialMappers);

  if (!hasAdminScope(session?.scopes ?? [])) {
    return null;
  }

  const isDeleted = beatmap.dataFetchStatus === DataFetchStatus.NotFound;
  const isDirty =
    form.formState.isDirty ||
    !sameOsuIds(setOwner, initialOwner) ||
    !sameOsuIds(mappers, initialMappers);

  function reset() {
    form.reset(defaultValues);
    setSetOwner(initialOwner);
    setMappers(initialMappers);
    setMode('edit');
    setSaveError(null);
  }

  function requestClose(next: boolean) {
    if (!next && isDirty) {
      setDiscarding(true);
      return;
    }

    if (next) {
      reset();
    }

    setOpen(next);
  }

  const save = form.handleSubmit(
    async (values) => {
      if (inFlight.current) return;

      inFlight.current = true;
      setSaving(true);
      setSaveError(null);

      try {
        await orpc.beatmaps.admin.update({
          id: beatmap.id,
          diffName: values.diffName,
          ruleset: Number(values.ruleset) as Ruleset,
          rankedStatus: beatmap.rankedStatus,
          totalLength: parseDuration(values.totalLength) ?? 0,
          drainLength: parseDuration(values.drainLength) ?? 0,
          bpm: Number(values.bpm),
          countCircle: Number(values.countCircle),
          countSlider: Number(values.countSlider),
          countSpinner: Number(values.countSpinner),
          cs: Number(values.cs),
          hp: Number(values.hp),
          od: Number(values.od),
          ar: Number(values.ar),
          sr: Number(values.sr),
          maxCombo: values.maxCombo === '' ? null : Number(values.maxCombo),
          titleOverride: values.titleOverride || null,
          artistOverride: values.artistOverride || null,
          setOwnerOsuIdOverride: setOwner[0]?.osuId ?? null,
          creatorOsuIds: mappers.map((mapper) => mapper.osuId),
        });

        saveToast();
        setOpen(false);
        setMode('edit');
        router.refresh();
      } catch (error) {
        const fields = fieldErrors(error);
        fields.forEach(({ name, message }, index) => {
          form.setError(name, { message }, { shouldFocus: index === 0 });
        });

        setMode('edit');

        if (!fields.length) {
          errorSaveToast();
          setSaveError(
            'The save did not go through. Your changes are still here.'
          );
        }
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    () => setMode('edit')
  );

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/20 bg-black/50 p-0.5 shadow-lg backdrop-blur-sm">
      <AuditButton
        entityType={AuditEntityType.Beatmap}
        entityId={beatmap.id}
        darkMode
      />
      <Dialog open={open} onOpenChange={requestClose}>
        <SimpleTooltip
          content={
            isDeleted
              ? 'Edit beatmap data'
              : 'Only beatmaps the osu! API no longer serves can be edited by hand'
          }
        >
          <span>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!isDeleted}
                aria-label="Edit beatmap data"
                className="size-6 rounded-full text-white/70 hover:bg-white/20 hover:text-white"
              >
                <PencilLine className="size-3" />
              </Button>
            </DialogTrigger>
          </span>
        </SimpleTooltip>
        <DialogContent className="flex flex-col gap-0 overflow-y-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle>Edit beatmap</DialogTitle>
            <DialogDescription>
              The osu! API no longer serves this beatmap. What you enter here is
              what the site will show.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => setMode('confirm'))}
              className="flex min-h-0 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <FieldGroup icon={Music2} title="Identity">
                  <FormField
                    control={form.control}
                    name="diffName"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>Difficulty</FieldLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="artistOverride"
                      render={({ field }) => (
                        <FormItem>
                          <FieldLabel>Artist</FieldLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="titleOverride"
                      render={({ field }) => (
                        <FormItem>
                          <FieldLabel>Title</FieldLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup icon={UserRound} title="Attribution">
                  <FormItem>
                    <FieldLabel>Set owner</FieldLabel>
                    <PlayerPicker
                      value={setOwner}
                      onChange={setSetOwner}
                      label="set owner"
                    />
                  </FormItem>
                  <FormItem>
                    <FieldLabel>Mappers</FieldLabel>
                    <PlayerPicker
                      value={mappers}
                      onChange={setMappers}
                      multiple
                      label="mappers"
                    />
                  </FormItem>
                </FieldGroup>

                <FieldGroup
                  icon={Gauge}
                  title="Difficulty and timing"
                  info="CS carries the key count in osu!mania."
                >
                  <FormField
                    control={form.control}
                    name="ruleset"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel>Ruleset</FieldLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <RulesetSelectContent />
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {DIFFICULTY_FIELDS.map((field) => (
                      <NumberField
                        key={field.name}
                        control={form.control}
                        {...field}
                      />
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup icon={Shapes} title="Objects">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {OBJECT_FIELDS.map((field) => (
                      <NumberField
                        key={field.name}
                        control={form.control}
                        {...field}
                      />
                    ))}
                  </div>
                </FieldGroup>
              </div>

              <div className="space-y-3 border-t bg-muted/30 px-5 py-4">
                <Alert
                  variant="destructive"
                  className="border-destructive/40 bg-destructive/5"
                >
                  <TriangleAlert />
                  <AlertTitle>Saving is permanent</AlertTitle>
                  <AlertDescription>
                    This beatmap stops receiving osu! API updates for good.
                    Nothing can undo it.
                  </AlertDescription>
                </Alert>

                {saveError ? (
                  <p className="text-sm font-medium text-destructive">
                    {saveError}
                  </p>
                ) : null}

                {mode === 'edit' ? (
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => requestClose(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive">
                      Save changes
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <p className="text-sm sm:mr-auto">
                      Pin this beatmap permanently?
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() => setMode('edit')}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={saving}
                        onClick={save}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Saving
                          </>
                        ) : (
                          'Save permanently'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discarding} onOpenChange={setDiscarding}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything you typed into this beatmap will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FieldGroup({
  icon: Icon,
  title,
  info,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-muted/25">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{title}</h3>
        {info ? (
          <SimpleTooltip content={info}>
            <button
              type="button"
              aria-label={`About ${title}`}
              className="shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="size-3.5" aria-hidden />
            </button>
          </SimpleTooltip>
        ) : null}
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
      <FormLabel>{children}</FormLabel>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

function NumberField({
  control,
  name,
  label,
  hint,
  step,
  placeholder,
}: NumericField & { control: Control<FormValues> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="content-end">
          <FieldLabel hint={hint}>{label}</FieldLabel>
          <FormControl>
            {step ? (
              <Input
                type="number"
                step={step}
                inputMode="decimal"
                placeholder={placeholder}
                {...field}
              />
            ) : (
              <Input inputMode="numeric" placeholder={placeholder} {...field} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type NumericField = {
  name: keyof FormValues;
  label: string;
  hint?: string;
  step?: string;
  placeholder?: string;
};

const DIFFICULTY_FIELDS: readonly NumericField[] = [
  { name: 'sr', label: 'Star rating', hint: 'stars', step: '0.01' },
  { name: 'bpm', label: 'BPM', hint: 'bpm', step: '0.01' },
  {
    name: 'totalLength',
    label: 'Length',
    hint: '[h:]mm:ss',
    placeholder: '3:42',
  },
  {
    name: 'drainLength',
    label: 'Drain',
    hint: '[h:]mm:ss',
    placeholder: '3:20',
  },
  {
    name: 'cs',
    label: 'CS',
    hint: '0-10; key count in osu!mania',
    step: '0.1',
  },
  { name: 'hp', label: 'HP', hint: '0-20', step: '0.1' },
  { name: 'od', label: 'OD', hint: '0-20', step: '0.1' },
  { name: 'ar', label: 'AR', hint: '0-20', step: '0.1' },
];

const OBJECT_FIELDS: readonly NumericField[] = [
  { name: 'countCircle', label: 'Circles', step: '1' },
  { name: 'countSlider', label: 'Sliders', step: '1' },
  { name: 'countSpinner', label: 'Spinners', step: '1' },
  {
    name: 'maxCombo',
    label: 'Max combo',
    hint: 'optional; 1 or more',
    step: '1',
  },
];
