'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Submit New Tournament
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Tournament Information</h3>
                <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="abbreviation"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <div className="flex items-center gap-2">
                        <FormLabel>Abbreviation</FormLabel>
                        <SimpleTooltip content="The prefix of each tournament lobby, such as 'OWC2024' from OWC2024: (United States) vs. (Canada)">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Input placeholder="OWC2024" {...field} />
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
                        <FormLabel>Name</FormLabel>
                        <SimpleTooltip content="Full tournament name (e.g. osu! World Cup 2024)">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Input placeholder="osu! World Cup 2024" {...field} />
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
                        <FormLabel>Forum Post URL</FormLabel>
                        <SimpleTooltip content="Forum post URL or wiki page for the tournament">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="https://osu.ppy.sh/community/forums/topics/..."
                          {...field}
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

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Tournament Settings</h3>
                <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="ruleset"
                  render={({ field }) => (
                    <FormItem className="min-w-[300px]">
                      <div className="flex items-center gap-2">
                        <FormLabel>Ruleset</FormLabel>
                        <SimpleTooltip content="Game mode the tournament is played in">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value.toString()}
                        >
                          <SelectTrigger className="w-full">
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
                    <FormItem className="min-w-[300px]">
                      <div className="flex items-center gap-2">
                        <FormLabel>Lobby Size</FormLabel>
                        <SimpleTooltip content="Number of players per team in each match">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value.toString()}
                        >
                          <SelectTrigger className="w-full">
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
                    <FormItem className="flex-1">
                      <div className="flex items-center gap-2">
                        <FormLabel>Rank Restriction</FormLabel>
                        <SimpleTooltip content="The 'best' global rank allowed to participate. Use 1 for open rank.">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </SimpleTooltip>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
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
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Match Resources</h3>
                {/* Match links */}
                <FormField
                control={form.control}
                name="matchLinks"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Match Links</FormLabel>
                      <SimpleTooltip content="osu! match IDs or URLs (one per line)">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </SimpleTooltip>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={`https://osu.ppy.sh/community/matches/12345\nhttps://osu.ppy.sh/mp/67890`}
                        value={field.value?.join('\n') || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value.split('\n'))
                        }
                        className="min-h-40"
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
                      <FormLabel>Beatmap Links</FormLabel>
                      <SimpleTooltip content="osu! beatmap IDs or URLs (one per line)">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </SimpleTooltip>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={`https://osu.ppy.sh/b/12345\nhttps://osu.ppy.sh/beatmapsets/123#osu/456`}
                        value={field.value?.join('\n') || ''}
                        onChange={(e) =>
                          field.onChange(e.target.value.split('\n'))
                        }
                        className="min-h-40"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Tournament"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
