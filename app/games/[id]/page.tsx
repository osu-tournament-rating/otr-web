import GameInfoContainer from '@/components/Games/InfoContainer/GameInfoContainer';
import ScoresList from '@/components/Scores/List/ScoresList';
import { GameDTO } from '@osu-tournament-rating/otr-api-client';

const tempdata: GameDTO = {
  id: 907359,
  ruleset: 0,
  scoringType: 3,
  teamType: 2,
  // @ts-ignore
  mods: 9,
  osuId: 596820797,
  verificationStatus: 2,
  processingStatus: 1,
  warningFlags: 0,
  rejectionReason: 0,
  // @ts-ignore
  startTime: '2024-07-27T12:03:39-04:00',
  // @ts-ignore
  endTime: '2024-07-27T12:07:00-04:00',
  beatmap: {
    id: 24102,
    artist: 'Endorfin. & Feryquitous',
    osuId: 2580586,
    bpm: 179,
    mapperId: 4990362,
    mapperName: 'Miura',
    sr: 5.61,
    cs: 4,
    ar: 9.4,
    hp: 6.4,
    od: 8.4,
    length: 210,
    title: 'Luminous Rage -Feryquitous OrderBless Remix-',
    diffName: 'Hems Flutter Away',
  },
  adminNotes: [],
  scores: [
    {
      playerId: 16704,
      team: 2,
      score: 416477,
      // @ts-ignore
      mods: 9,
      misses: 5,
      verificationStatus: 2,
      processingStatus: 1,
      rejectionReason: 0,
      accuracy: 97.72401433691756,
      adminNotes: [],
    },
    {
      playerId: 12636,
      team: 1,
      score: 733580,
      // @ts-ignore
      mods: 9,
      misses: 1,
      verificationStatus: 2,
      processingStatus: 1,
      rejectionReason: 0,
      accuracy: 96.91756272401433,
      adminNotes: [],
    },
    {
      playerId: 3604,
      team: 2,
      score: 831953,
      // @ts-ignore
      mods: 9,
      misses: 0,
      verificationStatus: 2,
      processingStatus: 1,
      rejectionReason: 0,
      accuracy: 98.38709677419355,
      adminNotes: [],
    },
    {
      playerId: 12839,
      team: 1,
      score: 1017443,
      // @ts-ignore
      mods: 9,
      misses: 0,
      verificationStatus: 2,
      processingStatus: 1,
      rejectionReason: 0,
      accuracy: 98.78136200716845,
      adminNotes: [],
    },
  ],
};

export default async function Page({
  params: { id },
}: {
  params: { id: number };
}) {
  return (
    <div className={'content'}>
      <h1>GAME ID {tempdata.id}</h1>
      <GameInfoContainer data={tempdata} />
      <ScoresList data={tempdata.scores} />
    </div>
  );
}
