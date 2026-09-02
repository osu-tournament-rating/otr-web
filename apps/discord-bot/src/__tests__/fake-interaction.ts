import { mock } from 'bun:test';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';

import type { Components, Payload } from '../runner';

const interactionId = '1300000000000000001';

export const fakeSlash = (
  commandName: string,
  options: Record<string, string | number | null> = {}
) => ({
  id: interactionId,
  commandName,
  options: {
    getString: (name: string) => {
      const value = options[name];
      return typeof value === 'string' ? value : null;
    },
    getInteger: (name: string) => {
      const value = options[name];
      return typeof value === 'number' ? value : null;
    },
  },
  deferReply: mock(async () => undefined),
  editReply: mock(async (_payload: Payload) => undefined),
});

export const fakeAutocomplete = (
  commandName: string,
  name: string,
  value: string
) => ({
  id: interactionId,
  commandName,
  options: { getFocused: (_full: true) => ({ name, value }) },
  respond: mock(
    async (_choices: ApplicationCommandOptionChoiceData[]) => undefined
  ),
});

export const fakeButton = (
  customId: string,
  { owner = true, components = [] as Components } = {}
) => ({
  id: interactionId,
  customId,
  user: { id: 'clicker' },
  message: {
    interactionMetadata: { user: { id: owner ? 'clicker' : 'someone-else' } },
    components,
  },
  deferUpdate: mock(async () => undefined),
  deferReply: mock(async (_options: { flags: number }) => undefined),
  editReply: mock(async (_payload: Payload) => undefined),
});

/** The first embed the fake received. */
export const sentEmbed = (interaction: {
  editReply: { mock: { calls: Payload[][] } };
}) => interaction.editReply.mock.calls[0][0].embeds[0];
