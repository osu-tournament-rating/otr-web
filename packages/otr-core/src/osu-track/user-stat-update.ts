/** osu!track API response: https://github.com/Ameobea/osutrack-api/blob/main/README.md */
export interface UserStatUpdate {
  count300: number;
  count100: number;
  count50: number;
  playCount: number;
  rankedScore: number;
  totalScore: number;
  rank: number;
  level: number;
  pp: number;
  /** Percentage, 0-100. */
  accuracy: number;
  countSs: number;
  countS: number;
  countA: number;
  timestamp: Date;
}
