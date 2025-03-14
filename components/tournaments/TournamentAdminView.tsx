'use client';

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
import { update } from '@/lib/actions/tournaments';
import { tournamentEditFormSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { createPatchOperations } from '@/lib/utils/form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Roles,
  TournamentCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { EditIcon, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ControllerFieldState, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import LobbySizeSelectContent from '../select/LobbySizeSelectContent';
import RulesetSelectContent from '../select/RulesetSelectContent';
import TournamentProcessingStatusSelectContent from '../select/TournamentProcessingStatusSelectContent';
import VerificationStatusSelectContent from '../select/VerificationStatusSelectContent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Select, SelectTrigger, SelectValue } from '../ui/select';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

export default function TournamentAdminView({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
  const form = useForm<z.infer<typeof tournamentEditFormSchema>>({
    resolver: zodResolver(tournamentEditFormSchema),
    defaultValues: tournament,
    mode: 'all',
  });

  const { data: session } = useSession();
  if (!session?.user?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof tournamentEditFormSchema>) {
    const patches = createPatchOperations(tournament, values);
    const patchedTournament = await update({
      id: tournament.id,
      body: patches,
    });
    form.reset(patchedTournament);
    toast.success('Saved successfully');
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-5 w-5" variant={'ghost'}>
          <EditIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
          <DialogDescription>Editing {tournament.name}</DialogDescription>
        </DialogHeader>
        {/* Edit form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Abbreviation</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-3">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
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
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Forum URL</FormLabel>
                  <FormControl>
                    <Input
                      className={inputChangedStyle(fieldState)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="ruleset"
                render={({ field: { onChange, value }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Ruleset</FormLabel>
                    <Select
                      onValueChange={(val) => onChange(Number(val))}
                      value={value.toString()}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger
                          className={inputChangedStyle(fieldState)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <RulesetSelectContent />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lobbySize"
                render={({ field: { onChange, value }, fieldState }) => {
                  return (
                    <FormItem className="flex-1">
                      <FormLabel>Format</FormLabel>
                      <Select
                        onValueChange={(val) => onChange(Number(val))}
                        value={value.toString()}
                      >
                        <FormControl className="w-full">
                          <SelectTrigger
                            className={inputChangedStyle(fieldState)}
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <LobbySizeSelectContent />
                      </Select>
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="rankRangeLowerBound"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Rank Restriction</FormLabel>
                    <FormControl className="w-full">
                      <Input
                        {...field}
                        min={1}
                        className={inputChangedStyle(fieldState)}
                        type={'number'}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="verificationStatus"
                render={({ field: { value, onChange }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Verification Status</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        onChange(Number(val));
                      }}
                      value={value.toString()}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger
                          className={inputChangedStyle(fieldState)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <VerificationStatusSelectContent />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="processingStatus"
                render={({ field: { value, onChange } }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Processing Status</FormLabel>
                    <Select
                      disabled
                      onValueChange={onChange}
                      value={value.toString()}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <TournamentProcessingStatusSelectContent />
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Form action buttons */}
            <div className="flex justify-between">
              {/* Reset changes */}
              <Button
                type="reset"
                variant={'secondary'}
                onClick={() => form.reset()}
                disabled={
                  !form.formState.isDirty || form.formState.isSubmitting
                }
              >
                Reset
              </Button>
              {/* Save changes */}
              <Button
                type="submit"
                disabled={
                  !form.formState.isDirty ||
                  (form.formState.isDirty && !form.formState.isValid)
                }
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
