import { z } from 'zod';

export const ProcessBeatmapAttributesPayloadSchema = z.object({
  jobId: z.string().min(1).max(128),
  generation: z.number().int().positive(),
});
