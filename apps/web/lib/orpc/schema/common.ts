import { tournamentAdminNoteSelectSchema, userSelectSchema } from './base';
import { PlayerSchema } from './player';

const adminNoteUserBaseSchema = userSelectSchema.pick({
  id: true,
  lastLogin: true,
});

export const AdminNoteUserSchema = adminNoteUserBaseSchema.extend({
  player: PlayerSchema,
});

const adminNoteBaseSchema = tournamentAdminNoteSelectSchema.pick({
  id: true,
  referenceId: true,
  note: true,
  created: true,
  updated: true,
});

export const AdminNoteSchema = adminNoteBaseSchema.extend({
  adminUser: AdminNoteUserSchema,
});
