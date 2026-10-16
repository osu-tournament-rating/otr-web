import { ScoreGrade } from '@otr/core/osu';

import { themeColor, type ThemeColor } from './theme-color';

export type GradeKey = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

function grade(key: string, light: string, dark: string): ThemeColor {
  return themeColor(`--score-grade-${key}`, light, dark, 'mark');
}

/**
 * Grade marks for charts and swatches. SS, S and A keep the hues of the osu!
 * grade badges; B to D are a grey ramp that recedes toward the card.
 */
export const GRADE_PALETTE: Readonly<Record<GradeKey, ThemeColor>> = {
  SS: grade('ss', '#de31ae', '#de31ae'),
  S: grade('s', '#0c98a4', '#02b5c3'),
  A: grade('a', '#5d9a03', '#88da20'),
  B: grade('b', '#3d3d3d', '#d7d7d7'),
  C: grade('c', '#5b5b5b', '#ababab'),
  D: grade('d', '#7a7a7a', '#808080'),
};

/** Folds the silver grades into their gold ones, as the badges do. */
export function getGradeKey(scoreGrade: ScoreGrade): GradeKey {
  switch (scoreGrade) {
    case ScoreGrade.SSH:
    case ScoreGrade.SS:
      return 'SS';
    case ScoreGrade.SH:
    case ScoreGrade.S:
      return 'S';
    case ScoreGrade.A:
      return 'A';
    case ScoreGrade.B:
      return 'B';
    case ScoreGrade.C:
      return 'C';
    default:
      return 'D';
  }
}

export function getGradeColor(scoreGrade: ScoreGrade): string {
  return GRADE_PALETTE[getGradeKey(scoreGrade)].css;
}
