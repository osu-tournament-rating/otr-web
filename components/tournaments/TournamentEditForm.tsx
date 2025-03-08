'use client';

import {
  OperationType,
  Ruleset,
  TournamentCompactDTO,
  TournamentProcessingStatus,
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
import RulesetFormItem from '../forms/RulesetFormItem';
import TournamentProcessingStatusFormItem from '../forms/TournamentProcessingStatusFormItem';
import VerificationStatusFormItem from '../forms/VerificationStatusFormItem';
import {
  RulesetEnumHelper,
  TournamentProcessingStatusEnumHelper,
  VerificationStatusEnumHelper,
} from '@/lib/enums';
import {
  getRulesetFromText,
  getTournamentProcessingStatusFromText,
  getVerificationStatusFromText,
} from '@/lib/utils/enum-utils';
import { tournaments } from '@/lib/api';
import { toast } from 'sonner';
import { isUndefined } from 'util';

const formSchema = z.object({
  name: z.string(),
  abbreviation: z.string().min(1),
  ruleset: z.string(),
  rankRange: z.number().min(1),
  verificationStatus: z.string(),
  forumUrl: z.string(),
  lobbySize: z.number().min(1).max(8),
  processingStatus: z.string(),
});

export default function TournamentEditForm({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      abbreviation: tournament.abbreviation,
      forumUrl: tournament.forumUrl,
      lobbySize: tournament.lobbySize,
      name: tournament.name,
      processingStatus: TournamentProcessingStatusEnumHelper.getMetadata(
        tournament.processingStatus
      ).text,
      rankRange: tournament.rankRangeLowerBound,
      ruleset: RulesetEnumHelper.getMetadata(tournament.ruleset).text,
      verificationStatus: VerificationStatusEnumHelper.getMetadata(
        tournament.verificationStatus
      ).text,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const ruleset = getRulesetFromText(values.ruleset);
    console.log(ruleset, typeof ruleset);
    if (ruleset === undefined) {
      throw new Error(`Invalid ruleset: ${values.ruleset}`);
    }

    const verificationStatus = getVerificationStatusFromText(
      values.verificationStatus
    );
    if (verificationStatus === undefined) {
      throw new Error(
        `Invalid verification status: ${values.verificationStatus}`
      );
    }

    const processingStatus = getTournamentProcessingStatusFromText(
      values.processingStatus
    );
    if (processingStatus === undefined) {
      throw new Error(`Invalid processing status: ${values.processingStatus}`);
    }

    const updatedTournament: TournamentCompactDTO = {
      ...tournament,
      name: values.name,
      abbreviation: values.abbreviation,
      ruleset: ruleset as Ruleset,
      rankRangeLowerBound: values.rankRange,
      verificationStatus: verificationStatus as VerificationStatus,
      forumUrl: values.forumUrl,
      lobbySize: values.lobbySize,
      processingStatus: processingStatus as TournamentProcessingStatus,
    };

    const response = await tournaments.update({
      id: updatedTournament.id,
      body: [
        {
          operationType: OperationType.Replace,
          path: '/name',
          value: updatedTournament.name,
        },
        {
          operationType: OperationType.Replace,
          path: '/abbreviation',
          value: updatedTournament.abbreviation,
        },
        {
          operationType: OperationType.Replace,
          path: '/ruleset',
          value: updatedTournament.ruleset,
        },
        {
          operationType: OperationType.Replace,
          path: '/rankRangeLowerBound',
          value: updatedTournament.rankRangeLowerBound,
        },
        {
          operationType: OperationType.Replace,
          path: '/verificationStatus',
          value: updatedTournament.verificationStatus,
        },
        {
          operationType: OperationType.Replace,
          path: '/forumUrl',
          value: updatedTournament.forumUrl,
        },
        {
          operationType: OperationType.Replace,
          path: '/lobbySize',
          value: updatedTournament.lobbySize,
        },
        {
          operationType: OperationType.Replace,
          path: '/processingStatus',
          value: updatedTournament.processingStatus,
        },
      ],
    });

    if (response.status == 200) {
      toast('Tournament updated successfully');
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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

        <div className="flex flex-row gap-5">
          <FormField
            control={form.control}
            name="ruleset"
            render={({ field }) => (
              <RulesetFormItem onChange={field.onChange} value={field.value} />
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem className="w-1/4">
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
            name="lobbySize"
            render={({ field }) => (
              <FormItem className="w-1/4">
                <FormLabel>Lobby Size</FormLabel>
                <FormControl>
                  <Input
                    type={'number'}
                    placeholder={tournament.lobbySize.toString()}
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
          name="forumUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forum URL</FormLabel>
              <FormControl>
                <Input placeholder={tournament.forumUrl} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="verificationStatus"
          render={({ field }) => (
            <VerificationStatusFormItem
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <FormField
          control={form.control}
          name="processingStatus"
          render={({ field }) => (
            <TournamentProcessingStatusFormItem
              onChange={field.onChange}
              value={field.value}
            />
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
