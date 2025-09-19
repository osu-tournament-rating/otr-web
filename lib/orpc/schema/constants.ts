import { z } from 'zod/v4';

export const CreatedUpdatedOmit = {
  created: true,
  updated: true,
} as const;

export const VerificationStatusSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type VerificationStatusValue = z.infer<typeof VerificationStatusSchema>;
