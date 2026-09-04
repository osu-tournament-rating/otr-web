import type {
  APIActionRowComponent,
  APIComponentInMessageActionRow,
  APIEmbed,
  ApplicationCommandOptionChoiceData,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import type { Api } from './api';
import type { CustomId } from './custom-id';
import type { EmojiResolver } from './emojis';

export type Reply = {
  embeds: APIEmbed[];
  components?: APIActionRowComponent<APIComponentInMessageActionRow>[];
  files?: { name: string; data: Uint8Array }[];
};

export type CommandOptions = {
  string(name: string): string | null;
  integer(name: string): number | null;
};

export type ViewContext = { siteUrl: string; emoji: EmojiResolver };

export type Page = (input: {
  id: CustomId;
  api: Api;
  ctx: ViewContext;
}) => Promise<Reply>;

export type Command = {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute(input: {
    options: CommandOptions;
    api: Api;
    ctx: ViewContext;
  }): Promise<Reply>;
  autocomplete?(input: {
    name: string;
    value: string;
    api: Api;
  }): Promise<ApplicationCommandOptionChoiceData[]>;
  /** Button views keyed by the `custom_id` view segment. */
  pages?: Record<string, Page>;
  notFound(query: string): string;
};

/** The user sees the message as the reply. */
export class ReplyError extends Error {}
