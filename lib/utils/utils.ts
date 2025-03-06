import {
  Ruleset,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
