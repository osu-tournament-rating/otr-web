import { z } from 'zod';

import { ReportEntityType, ReportStatus } from '@otr/core/osu/enums';

import { dataReportSelectSchema } from './base';
import { RulesetSchema } from './constants';

export const ReportReasonSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

export const ReportCreateInputSchema = z
  .object({
    entityType: z.nativeEnum(ReportEntityType),
    entityId: z.number().int().positive(),
    reasonKey: z.string().trim().min(1).optional(),
    additionalInformation: z.string().trim().max(2000).optional(),
    suggestedChanges: z.record(z.string(), z.string()).optional(),
    justification: z.string().min(1).optional(),
  })
  .superRefine((input, context) => {
    const isLegacyInput =
      input.suggestedChanges !== undefined && input.justification !== undefined;

    if (!input.reasonKey && !isLegacyInput) {
      context.addIssue({
        code: 'custom',
        message: 'Reason is required',
        path: ['reasonKey'],
      });
    }
  });

export const ReportTemplatesInputSchema = z.object({
  entityType: z.nativeEnum(ReportEntityType),
});

export const ReportTemplatesResponseSchema = z.object({
  entityType: z.nativeEnum(ReportEntityType),
  templates: z.array(ReportReasonSchema),
});

export const ReportListInputSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  entityType: z.nativeEnum(ReportEntityType).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const ReportResolveInputSchema = z.object({
  reportId: z.number().int().positive(),
  status: z.union([
    z.literal(ReportStatus.Approved),
    z.literal(ReportStatus.Rejected),
  ]),
  adminNote: z.string().trim().min(1, 'Comment is required').max(500),
});

export const ReportGetInputSchema = z.object({
  reportId: z.number().int().positive(),
});

export const ReportReopenInputSchema = z.object({
  reportId: z.number().int().positive(),
});

const reportPlayerSchema = z.object({
  id: z.number().int().positive(),
  osuId: z.number().int().positive(),
  username: z.string(),
  country: z.string(),
  defaultRuleset: RulesetSchema,
});

const reportUserSchema = z.object({
  id: z.number().int().positive(),
  player: reportPlayerSchema,
});

const reportBaseSchema = dataReportSelectSchema.pick({
  id: true,
  entityType: true,
  entityId: true,
  suggestedChanges: true,
  justification: true,
  status: true,
  adminNote: true,
  created: true,
  resolvedAt: true,
});

export const ReportSchema = reportBaseSchema.extend({
  reason: ReportReasonSchema,
  additionalInformation: z.string().nullable(),
  reporter: reportUserSchema.nullable(),
  resolvedBy: reportUserSchema.nullable(),
  entityDisplayName: z.string(),
  matchId: z.number().int().positive().optional(),
});

export const ReportListResponseSchema = z.object({
  reports: z.array(ReportSchema),
  totalCount: z.number().int().nonnegative(),
});

/**
 * Read-only view of a report for the user who created it. Intentionally omits
 * reporter/resolver identity and exposes whether an admin update is unread.
 */
export const MyReportSchema = reportBaseSchema.extend({
  reason: ReportReasonSchema,
  additionalInformation: z.string().nullable(),
  entityDisplayName: z.string(),
  matchId: z.number().int().positive().optional(),
  hasUnreadUpdate: z.boolean(),
});

export const MyReportListResponseSchema = z.object({
  reports: z.array(MyReportSchema),
});

export const MarkReportViewedInputSchema = z.object({
  reportId: z.number().int().positive(),
});

export const MyUnreadReportCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export const ReportMutationResponseSchema = z.object({
  success: z.boolean(),
  reportId: z.number().int().positive().optional(),
});

export type ReportCreateInput = z.infer<typeof ReportCreateInputSchema>;
export type ReportReason = z.infer<typeof ReportReasonSchema>;
export type ReportTemplatesInput = z.infer<typeof ReportTemplatesInputSchema>;
export type ReportTemplatesResponse = z.infer<
  typeof ReportTemplatesResponseSchema
>;
export type ReportListInput = z.infer<typeof ReportListInputSchema>;
export type ReportResolveInput = z.infer<typeof ReportResolveInputSchema>;
export type ReportGetInput = z.infer<typeof ReportGetInputSchema>;
export type ReportReopenInput = z.infer<typeof ReportReopenInputSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;
export type ReportMutationResponse = z.infer<
  typeof ReportMutationResponseSchema
>;

export const UnseenReportCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type UnseenReportCountResponse = z.infer<
  typeof UnseenReportCountResponseSchema
>;

export type MyReport = z.infer<typeof MyReportSchema>;
export type MyReportListResponse = z.infer<typeof MyReportListResponseSchema>;
export type MarkReportViewedInput = z.infer<typeof MarkReportViewedInputSchema>;
export type MyUnreadReportCountResponse = z.infer<
  typeof MyUnreadReportCountResponseSchema
>;
