'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Database, LoaderCircle } from 'lucide-react';
import LabelWithTooltip from '../ui/LabelWithTooltip';
import type { z as zType } from 'zod';
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
import { tournamentSubmissionFormSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import LobbySizeSelectContent from '../select/LobbySizeSelectContent';
import RulesetSelectContent from '../select/RulesetSelectContent';
import { Select, SelectTrigger, SelectValue } from '../ui/select';
import { submit } from '@/lib/actions/tournaments';

type TournamentSubmissionFormValues = zType.infer<
  typeof tournamentSubmissionFormSchema
>;

// Form section component for better organization
type FormSectionProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

const FormSection = ({ icon, title, children }: FormSectionProps) => (
  <div className="space-y-6">
    <div className="mb-4 flex items-center gap-3 rounded-md border-b border-border p-3 pb-3">
      {icon}
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

export default function TournamentSubmissionForm() {
  const form = useForm<TournamentSubmissionFormValues>({
    resolver: zodResolver(tournamentSubmissionFormSchema),
    defaultValues: {
      name: '',
      abbreviation: '',
      forumUrl: '',
      ruleset: undefined,
      rankRangeLowerBound: undefined,
      lobbySize: undefined,
      matches: [],
      beatmaps: [],
    },
    mode: 'onChange',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: TournamentSubmissionFormValues) {
    setIsSubmitting(true);
    try {
      await submit({
        body: {
          ...values,
          ids: values.matches.map((match) => parseInt(match.toString())),
          beatmapIds: values.beatmaps.map((beatmap) =>
            parseInt(beatmap.toString())
          ),
        },
      });

      form.reset();
      toast.success('Tournament submitted successfully!');
    } catch {
      toast.error(
        'An error occurred during the submission. Verify whether the tournament exists already.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-background px-8 shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormSection
            icon={<Trophy className="size-6 text-primary" />}
            title="Information"
          >
            <div className="flex flex-col gap-4 md:flex-row">
              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <LabelWithTooltip
                      label="Abbreviation"
                      tooltip="The prefix of each tournament lobby, such as 'OWC2024' from OWC2024: (United States) vs. (Canada)"
                    />
                    <FormControl>
                      <Input
                        placeholder="OWC2024"
                        {...field}
                        className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
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
                  <FormItem className="flex-1">
                    <LabelWithTooltip
                      label="Name"
                      tooltip="Full tournament name (e.g. osu! World Cup 2024)"
                    />
                    <FormControl>
                      <Input
                        placeholder="osu! World Cup 2024"
                        {...field}
                        className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
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
                      className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
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

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="ruleset"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Ruleset"
                    tooltip="Game mode the tournament is played in"
                  />
                  <FormControl>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value?.toString() || ''}
                    >
                      <SelectTrigger className="w-full border-2 border-input bg-card shadow-sm focus:border-primary focus:ring-1 focus:ring-primary">
                        <SelectValue placeholder="Select ruleset" />
                      </SelectTrigger>
                      <RulesetSelectContent />
                    </Select>
                  </FormControl>
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
                  <FormControl>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value?.toString() || ''}
                    >
                      <SelectTrigger className="w-full border-2 border-input bg-card shadow-sm focus:border-primary focus:ring-1 focus:ring-primary">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <LobbySizeSelectContent />
                    </Select>
                  </FormControl>
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
                      className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
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

          <FormSection
            icon={<Database className="h-6 w-6 text-primary" />}
            title="Data"
          >
            {/* Matches */}
            <FormField
              control={form.control}
              name="matches"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Matches"
                    tooltip="osu! match IDs or URLs (one per line)"
                  />
                  <FormControl>
                    <Textarea
                      placeholder={`https://osu.ppy.sh/community/matches/12345\nhttps://osu.ppy.sh/mp/67890`}
                      value={field.value?.join('\n') || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value.split('\n'))
                      }
                      className="min-h-32 border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Beatmap links */}
            <FormField
              control={form.control}
              name="beatmaps"
              render={({ field }) => (
                <FormItem>
                  <LabelWithTooltip
                    label="Beatmaps"
                    tooltip="osu! beatmap IDs or URLs (one per line)"
                  />
                  <FormControl>
                    <Textarea
                      placeholder={`https://osu.ppy.sh/b/12345\nhttps://osu.ppy.sh/beatmapsets/123#osu/456`}
                      value={field.value?.join('\n') || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value.split('\n'))
                      }
                      className="min-h-32 border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <Button
            type="submit"
            className="w-full rounded-md bg-primary py-6 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
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
    </Card>
  );
}
