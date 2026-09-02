export type PlayerKey = {
  id: number | string;
  keyType: 'otr' | 'osu' | 'username';
};

const decode = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

/** An osu! profile link, an o!TR player link, an osu! id, or an exact username. */
export function resolvePlayerKey(text: string): PlayerKey {
  const value = text.trim();
  const profile = value.match(/osu\.ppy\.sh\/(?:users|u)\/([^/?#\s]+)/i);
  if (profile) {
    return /^\d+$/.test(profile[1])
      ? { id: Number(profile[1]), keyType: 'osu' }
      : { id: decode(profile[1]), keyType: 'username' };
  }

  const site = value.match(/\/players\/(\d+)/);
  if (site) {
    return { id: Number(site[1]), keyType: 'otr' };
  }

  return /^\d+$/.test(value)
    ? { id: Number(value), keyType: 'osu' }
    : { id: value, keyType: 'username' };
}
