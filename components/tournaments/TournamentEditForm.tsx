'use client';

import {
  Ruleset,
  TournamentCompactDTO,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  SelectContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from '../ui/select';
import { rulesetString } from '@/lib/utils/enum-utils';

const formSchema = z.object({
  name: z.string(),
  abbreviation: z.string().min(1),
  ruleset: z.enum(Object.values(Ruleset) as [string, ...string[]]),
  rankRange: z.number().min(1),
  verificationStatus: z.enum(
    Object.values(VerificationStatus) as [string, ...string[]]
  ),
  forumUrl: z.string(),
  lobbySize: z.number().min(1).max(8),
});

function OnSubmit(values: z.infer<typeof formSchema>) {
  console.log(values);
}

export default function TournamentEditForm({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tournament.name,
      abbreviation: tournament.abbreviation,
      ruleset: tournament.ruleset.toString(),
      rankRange: tournament.rankRangeLowerBound,
      verificationStatus: tournament.verificationStatus.toString(),
      forumUrl: tournament.forumUrl,
      lobbySize: tournament.lobbySize,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(OnSubmit)}
        className="space-y-4 w-full mt-5"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder={tournament.name} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="abbreviation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abbreviation</FormLabel>
              <FormControl>
                <Input placeholder={tournament.abbreviation} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ruleset"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruleset</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Ruleset" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="osu">
                    {rulesetString(Ruleset.Osu)}
                  </SelectItem>
                  <SelectItem value="taiko">
                    {rulesetString(Ruleset.Taiko)}
                  </SelectItem>
                  <SelectItem value="catch">
                    {rulesetString(Ruleset.Catch)}
                  </SelectItem>
                  <SelectItem value="mania4k">
                    {rulesetString(Ruleset.Mania4k)}
                  </SelectItem>
                  <SelectItem value="mania7k">
                    {rulesetString(Ruleset.Mania7k)}
                  </SelectItem>
                  <SelectItem value="maniaOther">
                    {rulesetString(Ruleset.ManiaOther)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <div className="flex justify-between">
          <div className="flex gap-3">
            <Button
              type="reset"
              variant={'destructive'}
              onClick={() =>
                alert('Are you sure you want to delete this tournament?')
              }
            >
              Delete
            </Button>
          </div>
          <div className="flex gap-3">
            <Button type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
