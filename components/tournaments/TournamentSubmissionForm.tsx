'use client';

import { Button } from '@/components/ui/button';
import { z } from 'zod';
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
import { PlusIcon, TrashIcon } from 'lucide-react';
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
    setMatchInput(text);
    form.setValue('matchLinks', 
      text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    );
  };

  const handleBeatmapInput = (text: string) => {
    setBeatmapInput(text);
    form.setValue('beatmapLinks', 
      text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    );
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
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">Submit New Tournament</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="abbreviation"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Abbreviation</FormLabel>
                  <FormControl>
                    <Input placeholder="OTC" {...field} />
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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="osu! Tournament Championship" {...field} />
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
                <FormLabel>Forum Post URL</FormLabel>
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
                <FormItem className="flex-1">
                  <FormLabel>Ruleset</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger>
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
                <FormItem className="flex-1">
                  <FormLabel>Lobby Size</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value.toString()}
                    >
                      <SelectTrigger>
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
                  <FormLabel>Minimum Rank</FormLabel>
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

          <div className="space-y-4">
            {/* Match Links Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Match Links</h3>
                <div className="flex gap-2">
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
                        placeholder={`Paste match links/IDs (one per line):\nhttps://osu.ppy.sh/mp/...\n123456789\n...`}
                        className="flex h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                {form.watch('matchLinks').map((link, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">{link}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = form.getValues('matchLinks').filter((_, i) => i !== index);
                        form.setValue('matchLinks', updated);
                        setMatchInput(updated.join('\n'));
                      }}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Beatmap Links Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Beatmap Links</h3>
                <div className="flex gap-2">
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
                        placeholder={`Paste beatmap links/IDs (one per line):\nhttps://osu.ppy.sh/b/...\n123456\n...`}
                        className="flex h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                {form.watch('beatmapLinks').map((link, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">{link}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = form.getValues('beatmapLinks').filter((_, i) => i !== index);
                        form.setValue('beatmapLinks', updated);
                        setBeatmapInput(updated.join('\n'));
                      }}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Submit Tournament
          </Button>
        </form>
      </Form>
    </div>
  );
}
