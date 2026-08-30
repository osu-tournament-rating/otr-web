import { CurrentUserSchema, type CurrentUser } from '@/lib/orpc/schema/user';

export type SessionUser = CurrentUser & {
  player: CurrentUser['player'] & { defaultRuleset: number };
  themeHotkeyEnabled: boolean;
};

export const mapAppSessionToUser = (session: unknown): SessionUser | null => {
  if (
    !session ||
    typeof session !== 'object' ||
    !('dbPlayer' in session) ||
    !(session as { dbPlayer: unknown }).dbPlayer
  ) {
    return null;
  }

  const { dbPlayer, dbUser, themeHotkeyEnabled } = session as {
    dbPlayer: {
      id: number;
      osuId: number | bigint;
      username: string;
      country: string;
      defaultRuleset: number;
    };
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
    themeHotkeyEnabled?: boolean;
  };

  const parsed = CurrentUserSchema.safeParse({
    userId: dbUser?.id ?? null,
    scopes: dbUser?.scopes ?? [],
    player: {
      id: dbPlayer.id,
      osuId: Number(dbPlayer.osuId),
      username: dbPlayer.username,
      country: dbPlayer.country,
    },
  });

  if (!parsed.success) {
    console.error('[session] Failed to map session', parsed.error);
    return null;
  }

  return {
    ...parsed.data,
    player: {
      ...parsed.data.player,
      defaultRuleset: dbPlayer.defaultRuleset,
    },
    themeHotkeyEnabled: themeHotkeyEnabled ?? true,
  } satisfies SessionUser;
};
