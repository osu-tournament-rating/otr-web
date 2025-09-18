'use server';

import { tournaments } from '@/lib/api/server';

export async function insertBeatmaps(id: number, beatmapIds: number[]) {
  await tournaments.insertBeatmaps({ id, body: beatmapIds });
}

export async function deleteSpecificBeatmaps(id: number, beatmapIds: number[]) {
  await tournaments.deleteBeatmaps({ id, body: beatmapIds });
}
