'use client';

import {
  TournamentCompactDTO,
  TournamentProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
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
import { tournamentEditFormSchema } from '@/lib/schema';
import RulesetFormItem from '../forms/RulesetFormItem';
import LobbySizeFormItem from '../forms/LobbySizeFormItem';
import VerificationStatusFormItem from '../forms/VerificationStatusFormItem';
import TournamentProcessingStatusFormItem from '../forms/TournamentProcessingStatusFormItem';

export default function TournamentEditForm({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
  const form = useForm<z.infer<typeof tournamentEditFormSchema>>({
    resolver: zodResolver(tournamentEditFormSchema),
    defaultValues: tournament,
  });

  async function onSubmit(values: z.infer<typeof tournamentEditFormSchema>) {
    await new Promise((res) => setTimeout(() => {}, 2000));
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-5 w-full space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="forumUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forum URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row gap-5">
          <FormField
            control={form.control}
            name="ruleset"
            render={({ field: { onChange, value } }) => (
              <RulesetFormItem onChange={onChange} value={value.toString()} />
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem className="w-1/4">
                <FormLabel>Abbreviation</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lobbySize"
            render={({ field: { onChange, value } }) => (
              <LobbySizeFormItem onChange={onChange} value={value.toString()} />
            )}
          />
        </div>

        <div className="flex flex-row gap-5">
          <FormField
            control={form.control}
            name="verificationStatus"
            render={({ field: { value, onChange } }) => (
              <VerificationStatusFormItem
                onChange={onChange}
                value={value.toString()}
              />
            )}
          />
          <FormField
            control={form.control}
            name="rankRangeLowerBound"
            render={({ field }) => (
              <FormItem className="w-1/3">
                <FormLabel>Rank Restriction</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={tournament.rankRangeLowerBound.toString()}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="processingStatus"
          render={({ field: { value, onChange } }) => (
            <TournamentProcessingStatusFormItem
              onChange={onChange}
              value={
                value?.toString() ??
                TournamentProcessingStatus.NeedsApproval.toString()
              }
            />
          )}
        />
        <div className="flex justify-between">
          <div className="flex gap-3">
            <Button
              type="reset"
              variant={'secondary'}
              onClick={() => form.reset()}
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
            >
              Reset
            </Button>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={!form.formState.isDirty}>
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
