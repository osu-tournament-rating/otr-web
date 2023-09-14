export interface IUserRankingCardProps {
    rankingClass: string; // e.g. platnium, diamond
    rating: string; // player mu, rounded
    globalRank: string; // player global rank
    countryRank: string; // how well the player is doing compared to their friends
    percentile: string; // percentile ranking globally
    nextRankingClass: string; // e.g. platnium, diamond (next rank)
    ratingRemainingForNextRank: string; // how much rating is needed to reach the next rank
}