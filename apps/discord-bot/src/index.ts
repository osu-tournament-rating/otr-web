// First import: registers the tracer provider before anything else loads.
import './tracing';

import {
  Client,
  DiscordjsErrorCodes,
  Events,
  GatewayIntentBits,
} from 'discord.js';

import { createApi } from './api';
import { commands } from './commands';
import { env } from './env';
import { logger } from './logger';
import { gatewayConnected, startMetricsServer } from './metrics';
import {
  handleAutocomplete,
  handleButton,
  handleSlash,
  type Deps,
} from './runner';

startMetricsServer(env.metricsPort);
logger.info('Metrics server listening', { port: env.metricsPort });

const deps: Deps = {
  commands,
  api: (interactionId) => createApi(env.apiUrl, interactionId),
  siteUrl: env.siteUrl,
  logger,
};

const idle = (reason: string) => {
  logger.warn(`${reason}; the bot idles with health up until SIGTERM`);
  gatewayConnected.set(0);
  process.once('SIGTERM', () => process.exit(0));
  process.once('SIGINT', () => process.exit(0));
};

if (!env.token) {
  idle('DISCORD_BOT_TOKEN is blank');
} else {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, async (ready) => {
    gatewayConnected.set(1);
    const data = commands.map((command) => command.data);
    try {
      await (env.guildId
        ? ready.application.commands.set(data, env.guildId)
        : ready.application.commands.set(data));
      logger.info('Commands registered', {
        commands: data.map((command) => command.name),
        scope: env.guildId ? 'guild' : 'global',
      });
    } catch (error) {
      logger.error('Command registration failed', { error });
    }
  });
  client.on(Events.ShardReady, () => gatewayConnected.set(1));
  client.on(Events.ShardResume, () => gatewayConnected.set(1));
  client.on(Events.ShardDisconnect, () => gatewayConnected.set(0));

  client.on(Events.InteractionCreate, (interaction) => {
    const handled = interaction.isChatInputCommand()
      ? handleSlash(interaction, deps)
      : interaction.isAutocomplete()
        ? handleAutocomplete(interaction, deps)
        : interaction.isButton()
          ? handleButton(interaction, deps)
          : undefined;
    handled?.catch((error: unknown) =>
      logger.error('interaction failed', { error })
    );
  });

  const shutdown = async () => {
    logger.info('Shutting down');
    await client.destroy();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  client.login(env.token).catch((error: unknown) => {
    const code = (error as { code?: string }).code;
    if (code === DiscordjsErrorCodes.TokenInvalid) {
      idle('DISCORD_BOT_TOKEN is invalid');
      return;
    }
    logger.error('Login failed', { error });
    process.exit(1);
  });
}
