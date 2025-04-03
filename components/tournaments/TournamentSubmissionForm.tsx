'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';
import { z } from 'zod';
import type { z as zType } from 'zod';

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
import { tournamentSubmissionFormSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import LobbySizeSelectContent from '../select/LobbySizeSelectContent';
import RulesetSelectContent from '../select/RulesetSelectContent';
import { Select, SelectTrigger, SelectValue } from '../ui/select';

type TournamentSubmissionFormValues = zType.infer<typeof tournamentSubmissionFormSchema>;

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
      beatmapLinks: []
    },
    mode: 'onChange'
  });

  const [matchInput, setMatchInput] = useState('');
  const [beatmapInput, setBeatmapInput] = useState('');

  // Unified input handler for both match and beatmap links
  const createInputHandler = (setInput: React.Dispatch<React.SetStateAction<string>>, fieldName: 'matchLinks' | 'beatmapLinks') => 
    (text: string) => {
      const processedLines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      setInput(text);
      form.setValue(fieldName, processedLines, { shouldValidate: true });
    };

  const handleMatchInput = createInputHandler(setMatchInput, 'matchLinks');
  const handleBeatmapInput = createInputHandler(setBeatmapInput, 'beatmapLinks');

  async function onSubmit(values: TournamentSubmissionFormValues) {
    try {
      await submitTournament(values);
      form.reset();
      setMatchInput('');
      setBeatmapInput('');
      toast.success('Tournament submitted successfully!');
    } catch (error) {
      toast.error('Submission failed. Please check your inputs and try again.');
      console.error('Submission error:', error);
    }
  }

  // Clear all form inputs
  const clearInputs = () => {
    form.reset();
    setMatchInput('');
    setBeatmapInput('');
  };

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
            <CardContent className="space-y-4">
              {/* Matches Section */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Matches</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMatchInput('');
                    form.setValue('matchLinks', [], { shouldValidate: true });
                  }}
                >
                  Clear
                </Button>
              </div>
              <FormField
                control={form.control}
                name="matchLinks"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        value={matchInput}
                        onChange={(e) => handleMatchInput(e.target.value)}
                        placeholder={`Paste match links/IDs (one per line):\nhttps://osu.ppy.sh/mp/123456789\n...`}
                        className="flex h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                    {form.formState.errors.matchLinks && form.formState.errors.matchLinks.type === 'invalid_type' && (
                      <div className="text-sm text-destructive space-y-1">
                        <div>Contains invalid match links</div>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardContent className="space-y-4">
              {/* Beatmaps Section */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Beatmaps</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBeatmapInput('');
                    form.setValue('beatmapLinks', [], { shouldValidate: true });
                  }}
                >
                  Clear
                </Button>
              </div>
              <FormField
                control={form.control}
                name="beatmapLinks"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        value={beatmapInput}
                        onChange={(e) => handleBeatmapInput(e.target.value)}
                        placeholder={`Paste beatmap links/IDs (one per line):\nhttps://osu.ppy.sh/b/1234567\n...`}
                        className="flex h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                    {form.formState.errors.beatmapLinks && form.formState.errors.beatmapLinks.type === 'invalid_type' && (
                      <div className="text-sm text-destructive space-y-1">
                        <div>Contains invalid beatmap links</div>
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
