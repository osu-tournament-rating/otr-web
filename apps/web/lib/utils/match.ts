/** osu! lobby names follow `ACRONYM: (red team) vs (blue team)`. */
export function parseTeamNames(name: string) {
  const parsed = /^.*?:\s*\((.+)\)\s+vs\.?\s+\((.+)\)\s*$/i.exec(name.trim());

  if (!parsed) {
    return null;
  }

  const red = parsed[1]?.trim();
  const blue = parsed[2]?.trim();

  return red && blue ? { red, blue } : null;
}
