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
import { scoreEditFormSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Roles, GameScoreDTO } from '@osu-tournament-rating/otr-api-client';
import { EditIcon, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ControllerFieldState, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import VerificationStatusSelectContent from '@/components/select/VerificationStatusSelectContent';
import SimpleSelectContent from '@/components/select/SimpleSelectContent';
import {
  ScoreProcessingStatusEnumHelper,
  RulesetEnumHelper,
  TeamEnumHelper,
} from '@/lib/enums';
import { update } from '@/lib/actions/scores';
import { createPatchOperations } from '@/lib/utils/form';
import { errorSaveToast, saveToast } from '@/lib/utils/toasts';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

export default function ScoreAdminView({ score }: { score: GameScoreDTO }) {
  const form = useForm<z.infer<typeof scoreEditFormSchema>>({
    resolver: zodResolver(scoreEditFormSchema),
    defaultValues: score,
    mode: 'all',
  });

  const { data: session } = useSession();
  if (!session?.user?.scopes?.includes(Roles.Admin)) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof scoreEditFormSchema>) {
    try {
      const patchedScore = await update({
        id: score.id,
        body: createPatchOperations(score, values),
      });

      form.reset(patchedScore);
      saveToast();
    } catch (error) {
      errorSaveToast();
      console.error('Failed to save patched score', error, values);
    }
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
          <DialogTitle>Edit Score</DialogTitle>
          <DialogDescription>Editing Score {score.id}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-5">
              <FormField
                control={form.control}
                name="score"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Score</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placement"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Placement</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
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
                name="accuracy"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Accuracy</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        step="any"
                        min={0}
                        max={100}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxCombo"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Max Combo</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
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
                name="count300"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>300s</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="count100"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>100s</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="count50"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>50s</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
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
                name="countMiss"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Misses</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countGeki"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Gekis</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countKatu"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Katus</FormLabel>
                    <FormControl>
                      <Input
                        className={inputChangedStyle(fieldState)}
                        type="number"
                        min={0}
                        {...field}
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
                name="ruleset"
                render={({ field: { value, onChange }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Ruleset</FormLabel>
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
                      <SimpleSelectContent enumHelper={RulesetEnumHelper} />
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="team"
                render={({ field: { value, onChange }, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Team</FormLabel>
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
                      <SimpleSelectContent enumHelper={TeamEnumHelper} />
                    </Select>
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
                      <SimpleSelectContent
                        enumHelper={ScoreProcessingStatusEnumHelper}
                      />
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between">
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
