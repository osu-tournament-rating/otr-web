// noinspection SpellCheckingInspection

import {
  HttpValidationProblemDetails,
  ProblemDetails,
  Roles,
  Ruleset
} from '@osu-tournament-rating/otr-api-client';
import StandardSVG from '@/public/icons/Ruleset Standard.svg';
import StandardSVGurl from '@/public/icons/Ruleset Standard.svg';
import TaikoSVG from '@/public/icons/Ruleset Taiko.svg';
import TaikoSVGurl from '@/public/icons/Ruleset Taiko.svg';
import CtbSVG from '@/public/icons/Ruleset Catch.svg';
import CtbSVGurl from '@/public/icons/Ruleset Catch.svg';
import ManiaSVG from '@/public/icons/Ruleset Mania.svg';
import ManiaSVGurl from '@/public/icons/Ruleset Mania.svg';
import { RulesetIconContent } from '@/lib/types';

/** Type guard for determining if an object is {@link ProblemDetails} */
export function isProblemDetails(obj: any): obj is ProblemDetails {
  return (
    obj !== null
    && obj !== undefined
    && typeof obj === 'object'
    && 'title' in obj
    && 'status' in obj
  );
}

/** Type guard for determining if an object is {@link HttpValidationProblemDetails} */
export function isHttpValidationProblemDetails(obj: any): obj is HttpValidationProblemDetails {
  return (
    isProblemDetails(obj) 
    && 'errors' in obj
    && typeof obj.errors === 'object'
    && Object.values(obj.errors).every(
      (value) => Array.isArray(value) && value.every((v) => typeof v === "string")
    )
  );
}

/** Denotes if a list of scopes contains the admin scope */
export function isAdmin(scopes: string[]) {
  return scopes.includes(Roles.Admin);
}

// ===========
// == Enums ==
// ===========

/** Mapping of {@link RulesetIconContent} indexed by {@link Ruleset} */
export const rulesetIcons: { [key in Ruleset]: RulesetIconContent } = {
  [Ruleset.Osu]: {
    image: StandardSVG,
    imageUrl: StandardSVGurl,
    alt: 'osu!',
    shortAlt: 'Standard'
  },
  [Ruleset.Taiko]: {
    image: TaikoSVG,
    imageUrl: TaikoSVGurl,
    alt: 'osu!Taiko',
    shortAlt: 'Taiko'
  },
  [Ruleset.Catch]: {
    image: CtbSVG,
    imageUrl: CtbSVGurl,
    alt: 'osu!Catch',
    shortAlt: 'Catch'
  },
  [Ruleset.ManiaOther]: {
    image: ManiaSVG,
    imageUrl: ManiaSVGurl,
    alt: 'osu!Mania',
    shortAlt: 'Mania (Other)'
  },
  [Ruleset.Mania4k]: {
    image: ManiaSVG,
    imageUrl: ManiaSVGurl,
    alt: 'osu!Mania 4K',
    shortAlt: 'Mania 4K'
  },
  [Ruleset.Mania7k]: {
    image: ManiaSVG,
    imageUrl: ManiaSVGurl,
    alt: 'osu!Mania 7K',
    shortAlt: 'Mania 7K'
  }
};