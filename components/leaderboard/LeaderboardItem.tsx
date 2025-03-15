import {
  LeaderboardDTO,
  PlayerRatingStatsDTO,
} from '@osu-tournament-rating/otr-api-client';

export default function LeaderboardItem({
  item,
}: {
  item: PlayerRatingStatsDTO;
}) {
  return <h1>{item.player.osuId}</h1>;
}
