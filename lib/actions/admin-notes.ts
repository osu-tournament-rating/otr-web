'use server';

import {
  AdminNotesCreateNoteRequestParams,
  AdminNotesDeleteNoteRequestParams,
  AdminNotesUpdateNoteRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { adminNotes } from '../api';

export async function create(params: AdminNotesCreateNoteRequestParams) {
  const { result } = await adminNotes.createNote(params);
  return result;
}

export async function deleteNote(params: AdminNotesDeleteNoteRequestParams) {
  const { result } = await adminNotes.deleteNote(params);
  return result;
}

export async function updateNote(params: AdminNotesUpdateNoteRequestParams) {
  const { result } = await adminNotes.updateNote(params);
  return result;
}
