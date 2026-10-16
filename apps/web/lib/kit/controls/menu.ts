/** The fields `groupMenuActions` reads from a menu action. */
export interface GroupableMenuAction {
  /** Actions with the same group sit together between separators. */
  group?: string;
  /** Destructive actions always form the last group. */
  destructive?: boolean;
  /** Leaves the action out, for actions that depend on state. */
  hidden?: boolean;
}

/**
 * Splits menu actions into the groups a menu draws between separators.
 * Groups keep the order in which they first appear, actions keep their order
 * inside a group, and every destructive action moves into one last group, so
 * delete is always at the bottom. Hidden and falsy entries drop out, which
 * lets callers write `isLazer && { … }`.
 */
export function groupMenuActions<T extends GroupableMenuAction>(
  actions: readonly (T | false | null | undefined)[]
): T[][] {
  const groups = new Map<string, T[]>();
  const destructive: T[] = [];

  for (const action of actions) {
    if (!action || action.hidden) {
      continue;
    }

    if (action.destructive) {
      destructive.push(action);
      continue;
    }

    const key = action.group ?? '';
    const group = groups.get(key);

    if (group) {
      group.push(action);
    } else {
      groups.set(key, [action]);
    }
  }

  const result = [...groups.values()];

  if (destructive.length > 0) {
    result.push(destructive);
  }

  return result;
}
