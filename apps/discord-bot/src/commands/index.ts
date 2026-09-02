import type { Command } from '../command';
import type { CustomId } from '../custom-id';
import { beatmap } from './beatmap';
import { leaderboard } from './leaderboard';
import { player } from './player';
import { tournament } from './tournament';

export const commands = [player, tournament, beatmap, leaderboard];

/** The command and page that own a button view; undefined for an unknown view. */
export const findPage = (commands: Command[], id: CustomId) => {
  const command = commands.find(
    (candidate) =>
      candidate.pages !== undefined && Object.hasOwn(candidate.pages, id.view)
  );
  const page = command?.pages?.[id.view];
  return command && page ? { command, page } : undefined;
};
