import { z } from 'zod';

import { PlayerSchema } from './player';

export const CreatedUpdatedOmit = {
  created: true,
  updated: true,
} as const;

export const AdminNoteUserSchema = z.object({
  id: z.number().int(),
  lastLogin: z.string().nullable(),
  player: PlayerSchema,
});

export const AdminNoteSchema = z.object({
  id: z.number().int(),
  referenceId: z.number().int(),
  note: z.string(),
  created: z.string(),
  updated: z.string().nullable(),
  adminUser: AdminNoteUserSchema,
});
