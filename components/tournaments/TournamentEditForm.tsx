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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

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

export default function TournamentEditForm({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder={tournament.name} {...field} />
              </FormControl>
              <FormDescription>Tournament name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
