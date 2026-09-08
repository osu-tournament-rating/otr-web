import { Pool } from 'pg';
import { loadRootEnv } from '../../../../lib/env/load-root-env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { dbSchema } from '@otr/core/db';
import { instrumentPgPool } from '@otr/core/tracing';
import { QueueConstants } from '@otr/core';
import type { ProcessBeatmapAttributesMessage } from '@otr/core/messages/types';
import { RabbitMqPublisher } from '@otr/core/queues';
import { createBeatmapFileStorage, BeatmapFileDownloader } from './storage';
import { BeatmapAttributeService } from './service';
import { readAttributesConfig } from './policy';

export async function createAttributesRuntime() {
  loadRootEnv();
  const config = readAttributesConfig(process.env);
  if (!config.enabled)
    throw new Error('BEATMAP_ATTRIBUTES_ENABLED=true is required');
  const databaseUrl = process.env.DATABASE_URL;
  const amqpUrl = process.env.RABBITMQ_AMQP_URL;
  if (!databaseUrl || !amqpUrl)
    throw new Error('DATABASE_URL and RABBITMQ_AMQP_URL are required');
  const storage = await createBeatmapFileStorage(
    config.provider === 'local'
      ? { provider: 'local', directory: config.directory! }
      : {
          provider: 'gcp',
          bucket: config.bucket!,
          credentials: config.credentials,
        }
  );
  await storage.verifyAccess();
  const pool = instrumentPgPool(
    new Pool({
      connectionString: databaseUrl,
      max: config.concurrency + 2,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
    })
  );
  const db = drizzle(pool, { schema: dbSchema });
  const downloader = new BeatmapFileDownloader({
    concurrency: Math.min(config.concurrency, 2),
  });
  const service = new BeatmapAttributeService(db, storage, downloader);
  const publisher = new RabbitMqPublisher<ProcessBeatmapAttributesMessage>({
    url: amqpUrl,
    queue: QueueConstants.beatmapAttributes,
  });
  return {
    config,
    db,
    pool,
    storage,
    service,
    publisher,
    amqpUrl,
    close: async () => {
      try {
        await publisher.close();
      } finally {
        await pool.end();
      }
    },
  };
}
