'use client';

import { Flag, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { ReportEntityType } from '@otr/core/osu';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import SimpleTooltip from '@/components/simple-tooltip';
import { ReportEntityTypeEnumHelper } from '@/lib/enums';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import { cn } from '@/lib/utils';

interface ReportButtonProps {
  entityType: ReportEntityType;
  entityId: number;
  entityDisplayName: string;
  reportableFields: readonly string[];
  currentValues: Record<string, string | null>;
  darkMode?: boolean;
}

const reportFormSchema = z.object({
  selectedFields: z.array(z.string()).min(1, 'Select at least one field'),
  suggestedChanges: z.string().min(1, 'Suggested changes are required'),
  justification: z.string().min(1, 'Justification is required'),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

export default function ReportButton({
  entityType,
  entityId,
  entityDisplayName,
  reportableFields,
  currentValues,
  darkMode,
}: ReportButtonProps) {
  const session = useSession();
  const [open, setOpen] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      selectedFields: [],
      suggestedChanges: '',
      justification: '',
    },
  });

  if (!session) {
    return null;
  }

  const entityMetadata = ReportEntityTypeEnumHelper.getMetadata(entityType);

  async function onSubmit(data: ReportFormData) {
    const suggestedChanges: Record<string, string> = {};
    for (const field of data.selectedFields) {
      suggestedChanges[field] = data.suggestedChanges.trim();
    }

    try {
      await orpc.reports.create({
        entityType,
        entityId,
        suggestedChanges,
        justification: data.justification,
      });

      form.reset();
      setOpen(false);
      toast.success('Report submitted successfully');
    } catch {
      toast.error('Failed to submit report');
    }
  }

  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SimpleTooltip content="Report an issue">
        <DialogTrigger asChild>
          <Button
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
      <DialogContent className="max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle>Report Data Issue</DialogTitle>
          <DialogDescription>
            Report an issue with{' '}
            <span className="font-semibold">{entityDisplayName}</span> (
            {entityMetadata.text})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="selectedFields"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Select fields to report{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {reportableFields.map((reportableField) => {
                      const checkboxId = `report-field-${reportableField}`;
                      return (
                        <div
                          key={reportableField}
                          className="bg-muted/30 flex items-center gap-2 rounded-md px-2 py-1.5"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={field.value?.includes(reportableField)}
                            onCheckedChange={(checked) => {
                              const vals = field.value || [];
                              if (checked) {
                                field.onChange([...vals, reportableField]);
                              } else {
                                field.onChange(
                                  vals.filter((v) => v !== reportableField)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={checkboxId}
                            className="flex min-w-0 flex-1 cursor-pointer flex-col"
                          >
                            <span className="text-xs font-medium">
                              {formatFieldName(reportableField)}
                            </span>
                            <span className="text-muted-foreground truncate font-mono text-xs">
                              {currentValues[reportableField] || '—'}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suggestedChanges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Suggested changes <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what the correct values should be..."
                      className="min-h-20 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Justification <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why this data is incorrect and provide any supporting evidence..."
                      className="min-h-20 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between space-x-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  !form.formState.isValid ||
                  !form.formState.isDirty ||
                  form.formState.isSubmitting
                }
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
