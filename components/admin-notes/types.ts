import { z } from 'zod/v4';

import { AdminNoteSchema } from '@/lib/orpc/schema/common';

export type AdminNote = z.infer<typeof AdminNoteSchema>;
