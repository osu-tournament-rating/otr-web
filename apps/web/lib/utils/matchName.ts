/** `ABBR: (Red team) vs (Blue team)` is the osu! tournament match title convention. */
export function parseMatchTeams(name: string) {
  const parsed = name.match(/\(([^()]+)\)\s+vs\.?\s+\(([^()]+)\)\s*$/i);

  if (!parsed) {
    return null;
  }

  return { red: parsed[1].trim(), blue: parsed[2].trim() };
}
