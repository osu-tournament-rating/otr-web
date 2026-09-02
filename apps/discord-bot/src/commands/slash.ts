import { Ruleset } from '@otr/core/osu';
import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js';

import { RulesetEnumHelper } from '@/lib/enum-helpers';

/** A command usable in servers, DMs, and group DMs, by guild or user install. */
export const slash = (name: string, description: string) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    );

export const rulesetChoices = Object.values(Ruleset)
  .filter((value): value is Ruleset => typeof value === 'number')
  .map((value) => ({
    name: RulesetEnumHelper.getMetadata(value).text,
    value,
  }));
