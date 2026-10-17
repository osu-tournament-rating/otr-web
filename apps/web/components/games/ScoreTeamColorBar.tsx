import type { Team } from '@otr/core/osu';

import { getTeamColor } from '@/lib/kit/color/teams';

/** The coloured edge along a score card, in its team's colour. */
export default function ScoreTeamColorBar({ team }: { team: Team }) {
  return (
    <span
      aria-hidden="true"
      className="relative w-1.5 shrink-0 opacity-70"
      style={{ backgroundColor: getTeamColor(team) }}
    />
  );
}
