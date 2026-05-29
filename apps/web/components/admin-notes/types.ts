import { z } from 'zod';

import { AdminNoteSchema } from '@/lib/orpc/schema/common';

export type AdminNote = z.infer<typeof AdminNoteSchema>;
