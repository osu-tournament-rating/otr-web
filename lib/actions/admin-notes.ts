'use server';

import { AdminNotesCreateNoteRequestParams } from '@osu-tournament-rating/otr-api-client';
import { adminNotes } from '../api';

export async function create(params: AdminNotesCreateNoteRequestParams) {
  const { result } = await adminNotes.createNote(params);
  return result;
}
