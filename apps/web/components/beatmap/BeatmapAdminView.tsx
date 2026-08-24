'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EditIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuditEntityType, Ruleset } from '@otr/core/osu';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

import AuditButton from '@/components/audit/AuditButton';
import PlayerPicker from '@/components/beatmap/PlayerPicker';
import RulesetSelectContent from '@/components/select/RulesetSelectContent';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { errorSaveToast, saveToast } from '@/lib/utils/toasts';

const numeric = (max: number) => z.coerce.number().min(0).max(max);

const formSchema = z.object({
  diffName: z.string().trim().min(1),
  ruleset: z.coerce.number().int(),
  sr: numeric(100),
  bpm: numeric(10_000),
  totalLength: z.coerce.number().int().min(0).max(86_400),
  drainLength: z.coerce.number().int().min(0).max(86_400),
  cs: numeric(20),
  hp: numeric(20),
  od: numeric(20),
  ar: numeric(20),
  countCircle: z.coerce.number().int().min(0),
  countSlider: z.coerce.number().int().min(0),
  countSpinner: z.coerce.number().int().min(0),
  maxCombo: z.coerce.number().int().min(0).nullable(),
  title: z.string().trim().max(512),
  artist: z.string().trim().max(512),
});

type FormValues = z.input<typeof formSchema>;

export default function BeatmapAdminView({
  beatmap,
}: {
  beatmap: BeatmapWithDetails;
}) {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      diffName: beatmap.diffName,
      ruleset: beatmap.ruleset,
      sr: beatmap.sr,
      bpm: beatmap.bpm,
      totalLength: beatmap.totalLength,
      drainLength: beatmap.drainLength,
      cs: beatmap.cs,
      hp: beatmap.hp,
      od: beatmap.od,
      ar: beatmap.ar,
      countCircle: beatmap.countCircle,
      countSlider: beatmap.countSlider,
      countSpinner: beatmap.countSpinner,
      maxCombo: beatmap.maxCombo,
      title: beatmap.title ?? beatmap.beatmapset?.title ?? '',
      artist: beatmap.artist ?? beatmap.beatmapset?.artist ?? '',
    },
  });

  const [setOwner, setSetOwner] = useState<PlayerLookupResult[]>(
    beatmap.beatmapset?.creator
      ? [
          {
            osuId: beatmap.beatmapset.creator.osuId,
            username: beatmap.beatmapset.creator.username,
            playerId: beatmap.beatmapset.creator.id,
          },
        ]
      : []
  );

  const [mappers, setMappers] = useState<PlayerLookupResult[]>(
    beatmap.creators.map((creator) => ({
      osuId: creator.osuId,
      username: creator.username,
      playerId: creator.id,
    }))
  );

  if (!hasAdminScope(session?.scopes ?? [])) {
    return null;
  }

  const isDeleted = beatmap.dataFetchStatus === DataFetchStatus.NotFound;

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.parse(values);

    try {
      await orpc.beatmaps.admin.update({
        id: beatmap.id,
        diffName: parsed.diffName,
        ruleset: parsed.ruleset as Ruleset,
        rankedStatus: beatmap.rankedStatus,
        totalLength: parsed.totalLength,
        drainLength: parsed.drainLength,
        bpm: parsed.bpm,
        countCircle: parsed.countCircle,
        countSlider: parsed.countSlider,
        countSpinner: parsed.countSpinner,
        cs: parsed.cs,
        hp: parsed.hp,
        od: parsed.od,
        ar: parsed.ar,
        sr: parsed.sr,
        maxCombo: parsed.maxCombo,
        title: parsed.title || null,
        artist: parsed.artist || null,
        setOwnerOsuId: setOwner[0]?.osuId ?? null,
        creatorOsuIds: mappers.map((mapper) => mapper.osuId),
      });

      saveToast();
      setOpen(false);
      router.refresh();
    } catch {
      errorSaveToast();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <AuditButton
        entityType={AuditEntityType.Beatmap}
        entityId={beatmap.id}
        darkMode
      />
      <SimpleTooltip
        content={
          isDeleted
            ? 'Edit beatmap data'
            : 'Only beatmaps the osu! API no longer serves can be edited by hand'
        }
      >
        <span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!isDeleted}
                className="h-6 w-6 hover:bg-white/20 hover:text-white"
              >
                <EditIcon className="h-3 w-3 text-white/70 hover:text-white" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto p-4 sm:max-w-lg">
              <DialogHeader className="space-y-1">
                <DialogTitle>Edit beatmap</DialogTitle>
                <DialogDescription>
                  Saving pins this beatmap permanently. Refetches will no longer
                  update it.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-3"
                >
                  <FormField
                    control={form.control}
                    name="diffName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
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
                      name="artist"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Artist</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormItem>
                    <FormLabel>Set owner</FormLabel>
                    <PlayerPicker value={setOwner} onChange={setSetOwner} />
                  </FormItem>

                  <FormItem>
                    <FormLabel>Mappers</FormLabel>
                    <PlayerPicker
                      value={mappers}
                      onChange={setMappers}
                      multiple
                    />
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="ruleset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruleset</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value)}
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
                    {NUMERIC_FIELDS.map(({ name, label, step }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step={step}
                                {...field}
                                value={
                                  field.value === null ||
                                  field.value === undefined
                                    ? ''
                                    : String(field.value)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </span>
      </SimpleTooltip>
    </div>
  );
}

const NUMERIC_FIELDS = [
  { name: 'sr', label: 'Star rating', step: '0.01' },
  { name: 'bpm', label: 'BPM', step: '0.01' },
  { name: 'totalLength', label: 'Length (s)', step: '1' },
  { name: 'drainLength', label: 'Drain (s)', step: '1' },
  { name: 'cs', label: 'CS', step: '0.1' },
  { name: 'hp', label: 'HP', step: '0.1' },
  { name: 'od', label: 'OD', step: '0.1' },
  { name: 'ar', label: 'AR', step: '0.1' },
  { name: 'countCircle', label: 'Circles', step: '1' },
  { name: 'countSlider', label: 'Sliders', step: '1' },
  { name: 'countSpinner', label: 'Spinners', step: '1' },
  { name: 'maxCombo', label: 'Max combo', step: '1' },
] as const satisfies ReadonlyArray<{
  name: keyof FormValues;
  label: string;
  step: string;
}>;
