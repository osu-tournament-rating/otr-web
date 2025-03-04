import { TournamentCompactDTO } from "@osu-tournament-rating/otr-api-client";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { rulesetString } from "@/lib/utils";

export default function TournamentCard(tournament: TournamentCompactDTO) {
    return (
      <Card>
          <CardHeader>
              <CardTitle>{tournament.name}</CardTitle>
              <CardDescription className='font-mono'>
              {tournament.abbreviation} • {rulesetString(tournament.ruleset)} • {tournament.lobbySize}v{tournament.lobbySize} • #{tournament.rankRangeLowerBound}+
              </CardDescription>
          </CardHeader>
      </Card>
    );
}