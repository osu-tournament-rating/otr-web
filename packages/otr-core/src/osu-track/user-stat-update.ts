/** osu!track API response: https://github.com/Ameobea/osutrack-api/blob/main/README.md */
export interface UserStatUpdate {
  /** Number of 300 judgments. */
  count300: number;
  /** Number of 100 judgments. */
  count100: number;
  /** Number of 50 judgments. */
  count50: number;
  /** Total plays recorded. */
  playCount: number;
  /** Ranked score accumulated. */
  rankedScore: number;
  /** Overall score accumulated. */
  totalScore: number;
  /** Global rank at the time of the snapshot. */
  rank: number;
  /** Player level at the time of the snapshot. */
  level: number;
  /** Performance points value. */
  pp: number;
  /** Accuracy percentage as a float (0-100). */
  accuracy: number;
  /** Count of SS grades. */
  countSs: number;
  /** Count of S grades. */
  countS: number;
  /** Count of A grades. */
  countA: number;
  /** When the snapshot was recorded. */
  timestamp: Date;
}
