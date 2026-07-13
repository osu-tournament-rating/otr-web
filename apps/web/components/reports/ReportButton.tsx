'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Flag, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

import { ReportEntityType } from '@otr/core/osu';

import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ReportEntityTypeEnumHelper } from '@/lib/enum-helpers';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import { cn } from '@/lib/utils';

interface ReportButtonProps {
  entityType: ReportEntityType;
  entityId: number;
  entityDisplayName: string;
  darkMode?: boolean;
}

const MAX_ADDITIONAL_INFORMATION_LENGTH = 2_000;

const reportFormSchema = z.object({
  reasonKey: z.string().min(1, 'Select a reason'),
  additionalInformation: z
    .string()
    .max(
      MAX_ADDITIONAL_INFORMATION_LENGTH,
      `Additional information must be ${MAX_ADDITIONAL_INFORMATION_LENGTH.toLocaleString()} characters or fewer`
    ),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

export default function ReportButton({
  entityType,
  entityId,
  entityDisplayName,
  darkMode,
}: ReportButtonProps) {
  const session = useSession();
  const [open, setOpen] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema) as Resolver<ReportFormData>,
    defaultValues: {
      reasonKey: '',
      additionalInformation: '',
    },
    mode: 'onChange',
  });

  const {
    data: templateData,
    error: templateError,
    isLoading: templatesLoading,
    isValidating: templatesValidating,
    mutate: reloadTemplates,
  } = useSWR(
    open && session ? ['report-templates', entityType] : null,
    () => orpc.reports.templates({ entityType }),
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  if (!session) {
    return null;
  }

  const entityMetadata = ReportEntityTypeEnumHelper.getMetadata(entityType);
  const templates = templateData?.templates ?? [];
  const isLoadingTemplates =
    templates.length === 0 &&
    (templatesLoading || (templatesValidating && !templateData));
  const failedToLoadTemplates = Boolean(
    templateError && templates.length === 0 && !isLoadingTemplates
  );
  const hasNoTemplates = Boolean(
    templateData && templates.length === 0 && !templateError
  );
  const templatesUnavailable =
    isLoadingTemplates || failedToLoadTemplates || hasNoTemplates;
  const isSubmitting = form.formState.isSubmitting;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    setOpen(nextOpen);
  };

  async function onSubmit(data: ReportFormData) {
    const additionalInformation = data.additionalInformation.trim();

    try {
      await orpc.reports.create({
        entityType,
        entityId,
        reasonKey: data.reasonKey,
        additionalInformation: additionalInformation || undefined,
      });

      form.reset();
      setOpen(false);
      toast.success('Report submitted successfully');
    } catch {
      toast.error('Failed to submit report. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <SimpleTooltip content="Report an issue">
        <DialogTrigger asChild>
          <Button
            aria-label={`Report an issue with ${entityDisplayName} (${entityMetadata.text})`}
            data-testid="report-button"
            data-entity-type={entityType}
            data-entity-id={entityId}
            className={cn(
              'relative h-6 w-6',
              darkMode
                ? 'hover:bg-white/20 hover:text-white'
                : 'hover:bg-black/15 hover:text-black dark:hover:bg-white/20 dark:hover:text-white'
            )}
            variant="ghost"
            size="icon"
          >
            <Flag
              aria-hidden="true"
              className={cn(
                'h-3 w-3',
                darkMode
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            />
          </Button>
        </DialogTrigger>
      </SimpleTooltip>

      <DialogContent
        data-testid="report-dialog"
        data-entity-type={entityType}
        data-entity-id={entityId}
        className="max-h-[calc(100vh-2rem)] gap-5 overflow-y-auto border-border bg-card p-5 shadow-none sm:max-w-lg sm:p-6"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle>Report a data issue</DialogTitle>
          <DialogDescription>
            Report an issue with{' '}
            <span className="font-medium text-foreground">
              {entityDisplayName}
            </span>{' '}
            ({entityMetadata.text})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="reasonKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason{' '}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                    <span className="sr-only"> (required)</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={templatesUnavailable || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger
                        aria-required="true"
                        className="w-full bg-background shadow-none"
                      >
                        <SelectValue
                          placeholder={
                            isLoadingTemplates
                              ? 'Loading reasons...'
                              : 'Select a reason'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="shadow-none">
                      {templates.map((template) => (
                        <SelectItem key={template.key} value={template.key}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormDescription
                    role={
                      failedToLoadTemplates || hasNoTemplates
                        ? 'alert'
                        : 'status'
                    }
                    aria-live="polite"
                    className={cn(
                      'flex items-center gap-2',
                      (failedToLoadTemplates || hasNoTemplates) &&
                        'text-destructive'
                    )}
                  >
                    {isLoadingTemplates ? (
                      <>
                        <Loader2
                          className="size-3.5 animate-spin"
                          aria-hidden="true"
                        />
                        Loading report reasons...
                      </>
                    ) : failedToLoadTemplates ? (
                      'Report reasons could not be loaded.'
                    ) : hasNoTemplates ? (
                      'No report reasons are available.'
                    ) : (
                      'Choose the option that best describes the issue.'
                    )}
                  </FormDescription>

                  {failedToLoadTemplates && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit shadow-none"
                      onClick={() => void reloadTemplates()}
                    >
                      <RefreshCw aria-hidden="true" />
                      Retry
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalInformation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Additional information{' '}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add corrections, supporting links, or other context"
                      className="min-h-28 resize-y bg-background shadow-none"
                      maxLength={MAX_ADDITIONAL_INFORMATION_LENGTH}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include anything that may help an admin review the report.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="shadow-none"
                disabled={isSubmitting}
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="min-w-32 shadow-none"
                disabled={
                  templatesUnavailable ||
                  !form.formState.isValid ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Submitting...
                  </>
                ) : (
                  'Submit report'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
