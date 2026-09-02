import { SpanKind } from '@opentelemetry/api';
import type { Logger } from '@otr/core/logging';
import { withSpan } from '@otr/core/tracing';
import {
  ApplicationCommandOptionType,
  AttachmentBuilder,
  MessageFlags,
  type APIEmbed,
  type APIMessageTopLevelComponent,
  type ApplicationCommandOptionChoiceData,
  type JSONEncodable,
} from 'discord.js';

import { ApiError, type Api } from './api';
import { ReplyError, type Command, type Reply } from './command';
import { parseCustomId } from './custom-id';
import { commandCalls, commandDuration } from './metrics';
import { clip } from './views/format';
import { grey } from './views/theme';

export type Components = readonly (
  APIMessageTopLevelComponent | JSONEncodable<APIMessageTopLevelComponent>
)[];

export type Payload = {
  embeds: APIEmbed[];
  components?: Components;
  files?: AttachmentBuilder[];
};

export type SlashLike = {
  id: string;
  commandName: string;
  options: {
    getString(name: string): string | null;
    getInteger(name: string): number | null;
  };
  deferReply(): Promise<unknown>;
  editReply(payload: Payload): Promise<unknown>;
};

export type AutocompleteLike = {
  id: string;
  commandName: string;
  options: { getFocused(getFull: true): { name: string; value: string } };
  respond(choices: ApplicationCommandOptionChoiceData[]): Promise<unknown>;
};

export type ButtonLike = {
  id: string;
  customId: string;
  user: { id: string };
  message: {
    interactionMetadata: { user: { id: string } } | null;
    components: Components;
  };
  deferUpdate(): Promise<unknown>;
  deferReply(options: { flags: MessageFlags.Ephemeral }): Promise<unknown>;
  editReply(payload: Payload): Promise<unknown>;
};

export type Deps = {
  commands: Command[];
  api(interactionId: string): Api;
  siteUrl: string;
  logger: Logger;
};

export const GENERIC_ERROR = 'o!TR did not answer. Try again in a minute.';
export const EXPIRED = 'This button expired. Run the command again.';

/** Clips every text to its Discord limit; the clip is the only limit mechanism. */
export function finalize(reply: Reply): Reply {
  if (reply.embeds.length > 10) {
    throw new Error(`${reply.embeds.length} embeds exceed the limit of 10`);
  }

  const embeds = reply.embeds.map((embed) => {
    const clipped: APIEmbed = { ...embed };
    if (embed.title) clipped.title = clip(embed.title, 256);
    if (embed.description) clipped.description = clip(embed.description, 4096);
    if (embed.author)
      clipped.author = { ...embed.author, name: clip(embed.author.name, 256) };
    if (embed.footer)
      clipped.footer = { ...embed.footer, text: clip(embed.footer.text, 2048) };
    if (embed.fields) {
      clipped.fields = embed.fields.slice(0, 25).map((field) => ({
        ...field,
        name: clip(field.name, 256),
        value: clip(field.value, 1024),
      }));
    }
    return clipped;
  });

  const total = embeds.reduce(
    (sum, embed) =>
      sum +
      (embed.title?.length ?? 0) +
      (embed.description?.length ?? 0) +
      (embed.author?.name.length ?? 0) +
      (embed.footer?.text.length ?? 0) +
      (embed.fields?.reduce((s, f) => s + f.name.length + f.value.length, 0) ??
        0),
    0
  );
  if (total > 6000) {
    throw new Error(`${total} embed characters exceed the limit of 6000`);
  }

  return { ...reply, embeds };
}

const note = (text: string): Reply =>
  finalize({ embeds: [{ color: grey, description: text }] });

export const toPayload = (reply: Reply, components?: Components): Payload => ({
  embeds: reply.embeds,
  components: reply.components ?? components ?? [],
  files: (reply.files ?? []).map(
    (file) => new AttachmentBuilder(Buffer.from(file.data), { name: file.name })
  ),
});

/** False when Discord refuses the acknowledgement, for example after the 3 second window. */
const acknowledge = async (
  name: string,
  deps: Deps,
  run: () => Promise<unknown>
) => {
  try {
    await run();
    return true;
  } catch (error) {
    deps.logger.warn('acknowledgement failed', { command: name, error });
    commandCalls.labels({ command: name, status: 'error' }).inc();
    return false;
  }
};

type Delivery = {
  name: string;
  interactionId: string;
  deps: Deps;
  produce(): Promise<Reply>;
  send(payload: Payload): Promise<unknown>;
  notFound(): string;
  /** Components kept on an error reply. */
  keep?: Components;
};

async function deliver({
  name,
  interactionId,
  deps,
  produce,
  send,
  notFound,
  keep,
}: Delivery) {
  const stop = commandDuration.startTimer({ command: name });
  let status: 'success' | 'user_error' | 'error' = 'success';
  let payload: Payload;

  try {
    const reply = await withSpan(
      `command /${name}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'discord.command': name,
          'discord.interaction_id': interactionId,
        },
      },
      produce
    );
    payload = toPayload(finalize(reply));
  } catch (error) {
    if (error instanceof ReplyError) {
      status = 'user_error';
      payload = toPayload(note(error.message), keep);
    } else if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      status = 'user_error';
      payload = toPayload(note(notFound()), keep);
    } else {
      status = 'error';
      payload = toPayload(note(GENERIC_ERROR), keep);
      deps.logger.error('command failed', {
        command: name,
        procedure: error instanceof ApiError ? error.procedure : undefined,
        error,
      });
    }
  }

  try {
    await send(payload);
  } catch (error) {
    status = 'error';
    deps.logger.error('reply failed', { command: name, error });
  } finally {
    commandCalls.labels({ command: name, status }).inc();
    stop();
  }
}

const findCommand = (deps: Deps, name: string) =>
  deps.commands.find((command) => command.data.name === name);

export async function handleSlash(interaction: SlashLike, deps: Deps) {
  const command = findCommand(deps, interaction.commandName);
  if (!command) {
    deps.logger.warn('unknown command', { command: interaction.commandName });
    return;
  }

  const name = command.data.name;
  if (!(await acknowledge(name, deps, () => interaction.deferReply()))) {
    return;
  }

  const options = {
    string: (name: string) => interaction.options.getString(name),
    integer: (name: string) => interaction.options.getInteger(name),
  };
  const first = command.data.options?.[0];
  const query =
    first?.type === ApplicationCommandOptionType.String
      ? (options.string(first.name) ?? '')
      : '';

  await deliver({
    name,
    interactionId: interaction.id,
    deps,
    produce: () =>
      command.execute({
        options,
        api: deps.api(interaction.id),
        ctx: { siteUrl: deps.siteUrl },
      }),
    send: (payload) => interaction.editReply(payload),
    notFound: () => command.notFound(query),
  });
}

export async function handleAutocomplete(
  interaction: AutocompleteLike,
  deps: Deps
) {
  const command = findCommand(deps, interaction.commandName);
  const name = `${interaction.commandName}:autocomplete`;
  let choices: ApplicationCommandOptionChoiceData[] = [];
  let status: 'success' | 'error' = 'success';

  try {
    const focused = interaction.options.getFocused(true);
    if (command?.autocomplete) {
      const found = await command.autocomplete({
        name: focused.name,
        value: focused.value,
        api: deps.api(interaction.id),
      });
      choices = found.slice(0, 25);
    }
  } catch (error) {
    status = 'error';
    deps.logger.warn('autocomplete failed', { command: name, error });
  }

  await interaction.respond(choices).catch(() => undefined);
  commandCalls.labels({ command: name, status }).inc();
}

export async function handleButton(interaction: ButtonLike, deps: Deps) {
  const id = parseCustomId(interaction.customId);
  const command = id
    ? deps.commands.find(
        (candidate) =>
          candidate.pages !== undefined &&
          Object.hasOwn(candidate.pages, id.view)
      )
    : undefined;
  const page = id && command?.pages?.[id.view];
  const owner =
    interaction.message.interactionMetadata?.user.id === interaction.user.id;

  if (!id || !command || !page) {
    const ephemeral = () =>
      interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (await acknowledge('button', deps, ephemeral)) {
      await interaction
        .editReply(toPayload(note(EXPIRED)))
        .catch((error: unknown) =>
          deps.logger.warn('reply failed', { command: 'button', error })
        );
    }
    return;
  }

  const name = `${command.data.name}:${id.view}`;
  const acknowledged = await acknowledge(name, deps, () =>
    owner
      ? interaction.deferUpdate()
      : interaction.deferReply({ flags: MessageFlags.Ephemeral })
  );
  if (!acknowledged) {
    return;
  }

  await deliver({
    name,
    interactionId: interaction.id,
    deps,
    produce: () =>
      page({
        id,
        api: deps.api(interaction.id),
        ctx: { siteUrl: deps.siteUrl },
      }),
    send: (payload) => interaction.editReply(payload),
    notFound: () => command.notFound(id.key),
    keep: owner ? interaction.message.components : undefined,
  });
}
