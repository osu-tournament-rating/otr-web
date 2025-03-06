import {
  Ruleset,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function rulesetString(ruleset: Ruleset) {
  switch (ruleset) {
    case 0:
      return 'osu!';
    case 1:
      return 'Taiko';
    case 2:
      return 'Catch';
    case 3:
      return 'Mania Other';
    case 4:
      return 'Mania 4K';
    case 5:
      return 'Mania 7K';
  }
}

export function verificationStatusString(status: VerificationStatus) {
  switch (status) {
    case 0:
      return 'Pending';
    case 1:
      return 'Pre-Rejected';
    case 2:
      return 'Pre-Verified';
    case 3:
      return 'Rejected';
    case 4:
      return 'Verified';
    default:
      return 'Unknown';
  }
}
