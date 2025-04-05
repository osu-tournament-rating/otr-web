'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, Trophy, Database, ExternalLink } from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';
import type { z as zType } from 'zod';
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
      matchLinks: [],
      beatmapLinks: [],
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
          ids: values.matchLinks.map((link) => parseInt(link.toString())),
          beatmapIds: values.beatmapLinks.map((link) =>
            parseInt(link.toString())
          ),
        },
      });
      form.reset();
      toast.success('Tournament submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Submission failed. Please check your inputs and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full font-sans">
      <div className="mb-8 text-center">
        <h1 className="mb-3 flex items-center justify-center gap-2  font-bold text-primary text-xl md:text-3xl">
          <Trophy className="h-9 w-9" />
          Tournament Submission
        </h1>
        <p className="text-md text-muted-foreground">
          Use this form to submit a new tournament for verification and
          tracking.
        </p>
        <a
          href="https://docs.otr.stagec.xyz/tournament-approval.html#acceptance-criteria"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
        >
          <ExternalLink className="mr-1 h-4 w-4" />
          Read our acceptance criteria
        </a>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <CardContent className="px-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div className="mb-4 flex items-center gap-3 rounded-md border-b border-border p-3 pb-3">
                  <Trophy className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">
                    Information
                  </h3>
                </div>

                <div className="flex flex-col gap-4 md:flex-row">
                  <FormField
                    control={form.control}
                    name="abbreviation"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="flex items-center gap-2">
                          <FormLabel className="font-medium text-foreground">
                            Abbreviation
                          </FormLabel>
                          <SimpleTooltip content="The prefix of each tournament lobby, such as 'OWC2024' from OWC2024: (United States) vs. (Canada)">
                            <HelpCircle className="h-4 w-4 text-primary/70" />
                          </SimpleTooltip>
                        </div>
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
                        <div className="flex items-center gap-2">
                          <FormLabel className="font-medium text-foreground">
                            Name
                          </FormLabel>
                          <SimpleTooltip content="Full tournament name (e.g. osu! World Cup 2024)">
                            <HelpCircle className="h-4 w-4 text-primary/70" />
                          </SimpleTooltip>
                        </div>
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium text-foreground">
                          Forum Post URL
                        </FormLabel>
                        <SimpleTooltip content="Forum post URL or wiki page for the tournament">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
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
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="ruleset"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium text-foreground">
                          Ruleset
                        </FormLabel>
                        <SimpleTooltip content="Game mode the tournament is played in">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium text-foreground">
                          Lobby Size
                        </FormLabel>
                        <SimpleTooltip content="Number of players per team in each match">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium text-foreground">
                          Rank Restriction
                        </FormLabel>
                        <SimpleTooltip content="The 'best' global rank allowed to participate. Use 1 for open rank.">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
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

              <div className="space-y-6 pt-2">
                <div className="mb-4 flex items-center gap-3 rounded-md border-b border-border p-3 pb-3">
                  <Database className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">
                    Data
                  </h3>
                </div>

                {/* Match links */}
                <FormField
                  control={form.control}
                  name="matchLinks"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium text-foreground">
                          Match Links
                        </FormLabel>
                        <SimpleTooltip content="osu! match IDs or URLs (one per line)">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
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
                  name="beatmapLinks"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="font-medium text-foreground">
                          Beatmap Links
                        </FormLabel>
                        <SimpleTooltip content="osu! beatmap IDs or URLs (one per line)">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
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
              </div>

              <Button
                type="submit"
                className="w-full rounded-md bg-primary py-6 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Tournament'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
