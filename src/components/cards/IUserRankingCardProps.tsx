export interface IUserRankingCardProps {
    rankingClass: string; // e.g. platnium, diamond
    rating: number; // player mu, rounded
    globalRank: number; // player global rank
    countryRank: number; // how well the player is doing compared to their friends
    percentile: number; // percentile ranking globally
    nextRankingClass: string; // e.g. platnium, diamond (next rank)
    ratingRemainingForNextRank: number; // how much rating is needed to reach the next rank
    ratingDelta: number;

    // Trends
    isRatingPositiveTrend: boolean;
    isGlobalRankPositiveTrend: boolean;
    isCountryRankPositiveTrend: boolean;
    isPercentilePositiveTrend: boolean;
}