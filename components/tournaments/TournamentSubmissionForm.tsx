'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';
import { z } from 'zod';

function validateLinks(links: string[], type: 'match' | 'beatmap'): string[] {
  const errors: string[] = [];
  const urlPattern = type === 'match' 
    ? /^(https:\/\/osu\.ppy\.sh\/mp\/\d+|^\d+$)/
    : /^(https:\/\/osu\.ppy\.sh\/b\/\d+|^\d+$)/;

  links.forEach((link, index) => {
    if (!urlPattern.test(link)) {
      errors.push(`Line ${index + 1}: "${link}" is not a valid ${type} link/ID`);
    }
  });

  return errors;
}
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { submitTournament } from '@/lib/actions/tournaments';
import { tournamentSubmissionSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import LobbySizeSelectContent from '../select/LobbySizeSelectContent';
import RulesetSelectContent from '../select/RulesetSelectContent';
import { Select, SelectTrigger, SelectValue } from '../ui/select';

type TournamentSubmissionFormValues = z.infer<typeof tournamentSubmissionSchema>;

export default function TournamentSubmissionForm() {
  const form = useForm<TournamentSubmissionFormValues>({
    resolver: zodResolver(tournamentSubmissionSchema),
    defaultValues: {
      name: '',
      abbreviation: '',
      forumUrl: '',
      ruleset: 0,
      rankRangeLowerBound: 1,
      lobbySize: 1,
      matchLinks: [],
      beatmapLinks: []
    },
    mode: 'onBlur'
  });

  const [matchInput, setMatchInput] = useState('');
  const [beatmapInput, setBeatmapInput] = useState('');

  const handleMatchInput = (text: string) => {
    const links = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const errors = validateLinks(links, 'match');
    form.setValue('matchLinks', links, { shouldValidate: true });
    setMatchInput(text);
    if (errors.length > 0) {
      form.setError('matchLinks', { message: errors.join('\n') });
    } else {
      form.clearErrors('matchLinks');
    }
  };

  const handleBeatmapInput = (text: string) => {
    const links = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const errors = validateLinks(links, 'beatmap');
    form.setValue('beatmapLinks', links, { shouldValidate: true });
    setBeatmapInput(text);
    if (errors.length > 0) {
      form.setError('beatmapLinks', { message: errors.join('\n') });
    } else {
      form.clearErrors('beatmapLinks');
    }
  };

  async function onSubmit(values: z.infer<typeof tournamentSubmissionSchema>) {
    try {
      await submitTournament(values);
      form.reset();
      toast.success('Tournament submitted successfully!');
    } catch (error) {
      toast.error('Submission failed. Check the console logs and report to the developers if needed.');
      console.error('Failed to submit tournament!', values, error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 font-sans">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Submit New Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <SimpleTooltip content="Official forum post URL for the tournament">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </SimpleTooltip>
                </div>
                <FormControl>
                  <Input
                    placeholder="https://osu.ppy.sh/community/forums/topics/..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Card className="w-full">
            <CardContent className="space-y-4 pt-6">
              {/* Match Links Section */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Match Links</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMatchInput('');
                    form.setValue('matchLinks', []);
                  }}
                >
                  Clear All
                </Button>
              </div>
              <FormField
                control={form.control}
                name="matchLinks"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        value={matchInput}
                        onChange={(e) => handleMatchInput(e.target.value)}
                        placeholder={`Paste match links/IDs (one per line):\nhttps://osu.ppy.sh/mp/123456789\nosu! World Cup 2023 Grand Finals\n...`}
                        className="flex h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    {form.formState.errors.matchLinks?.message && (
                      <div className="text-sm text-destructive space-y-1">
                        {form.formState.errors.matchLinks.message.split('\n').map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardContent className="space-y-4 pt-6">
              {/* Beatmap Links Section */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Beatmap Links</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBeatmapInput('');
                    form.setValue('beatmapLinks', []);
                  }}
                >
                  Clear All
                </Button>
              </div>
              <FormField
                control={form.control}
                name="beatmapLinks"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        value={beatmapInput}
                        onChange={(e) => handleBeatmapInput(e.target.value)}
                        placeholder={`Paste beatmap links/IDs (one per line):\nhttps://osu.ppy.sh/b/1234567\nosu! World Cup 2023 Finals Tiebreaker\n...`}
                        className="flex h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    {form.formState.errors.beatmapLinks?.message && (
                      <div className="text-sm text-destructive space-y-1">
                        {form.formState.errors.beatmapLinks.message.split('\n').map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

              <Button type="submit" className="w-full">
                Submit Tournament
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
