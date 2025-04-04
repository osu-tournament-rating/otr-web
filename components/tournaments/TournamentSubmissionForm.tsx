'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Trophy, Database, Link, Map } from 'lucide-react';
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
      ruleset: 0,
      rankRangeLowerBound: 1,
      lobbySize: 1,
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
    <div className="mx-auto max-w-6xl p-6 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-primary flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8" /> Submit Tournament
        </h1>
        <p className="text-muted-foreground">
          Use this form to submit a new tournament for verification and tracking.
        </p>
        <a 
          href="https://docs.otr.stagec.xyz/tournament-approval.html#acceptance-criteria" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          <HelpCircle className="mr-1 h-4 w-4" />
          Read our tournament acceptance criteria
        </a>
      </div>

      <Card className="shadow-md border-primary/10 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-primary">Tournament Information</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="abbreviation"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-foreground/90 font-medium">Abbreviation</FormLabel>
                          <SimpleTooltip content="The prefix of each tournament lobby, such as 'OWC2024' from OWC2024: (United States) vs. (Canada)">
                            <HelpCircle className="h-4 w-4 text-primary/70" />
                          </SimpleTooltip>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="OWC2024"
                            {...field}
                            className="bg-background/50 border-primary/20 focus-visible:border-primary"
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
                          <FormLabel className="text-foreground/90 font-medium">Name</FormLabel>
                          <SimpleTooltip content="Full tournament name (e.g. osu! World Cup 2024)">
                            <HelpCircle className="h-4 w-4 text-primary/70" />
                          </SimpleTooltip>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="osu! World Cup 2024"
                            {...field}
                            className="bg-background/50 border-primary/20 focus-visible:border-primary"
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
                        <FormLabel className="text-foreground/90 font-medium">Forum Post URL</FormLabel>
                        <SimpleTooltip content="Forum post URL or wiki page for the tournament">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="https://osu.ppy.sh/community/forums/topics/..."
                          {...field}
                          className="bg-background/50 border-primary/20 focus-visible:border-primary"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <FormField
                  control={form.control}
                  name="ruleset"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-foreground/90 font-medium">Ruleset</FormLabel>
                        <SimpleTooltip content="Game mode the tournament is played in">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value.toString()}
                        >
                          <SelectTrigger className="w-full bg-background/50 border-primary/20">
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
                        <FormLabel className="text-foreground/90 font-medium">Lobby Size</FormLabel>
                        <SimpleTooltip content="Number of players per team in each match">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value.toString()}
                        >
                          <SelectTrigger className="w-full bg-background/50 border-primary/20">
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
                        <FormLabel className="text-foreground/90 font-medium">Rank Restriction</FormLabel>
                        <SimpleTooltip content="The 'best' global rank allowed to participate. Use 1 for open rank.">
                          <HelpCircle className="h-4 w-4 text-primary/70" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className="bg-background/50 border-primary/20 focus-visible:border-primary"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                  <Database className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-primary">Tournament Data</h3>
                </div>

                {/* Match links */}
                <FormField
                  control={form.control}
                  name="matchLinks"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-foreground/90 font-medium">Match Links</FormLabel>
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
                          className="min-h-32 bg-background/50 border-primary/20 focus-visible:border-primary backdrop-blur-sm"
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
                        <FormLabel className="text-foreground/90 font-medium">Beatmap Links</FormLabel>
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
                          className="min-h-32 bg-background/50 border-primary/20 focus-visible:border-primary backdrop-blur-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full py-6 mt-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-lg font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Tournament"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
