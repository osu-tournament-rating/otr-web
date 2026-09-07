import '../tracing';
import { QueueConstants } from '@otr/core';
import { ProcessBeatmapAttributesPayloadSchema } from '@otr/core/messages/beatmap-attributes';
import { RabbitMqConsumer } from '../queue/rabbitmq-consumer';
import { createAttributesRuntime } from './runtime';
import { RECONCILE_MS } from './policy';

const runtime = await createAttributesRuntime();
const consumer = new RabbitMqConsumer<{ jobId: string; generation: number }>({
  url: runtime.amqpUrl,
  queue: QueueConstants.beatmapAttributes,
  prefetch: runtime.config.concurrency,
});
const active = new Set<Promise<void>>();
let stopping = false;
let reconciliation: Promise<void> | null = null;
const reconcile = () => {
  if (stopping || reconciliation) return;
  reconciliation = runtime.service
    .reconcile(
      (payload) => runtime.publisher.publish(payload),
      process.env.BEATMAP_ATTRIBUTES_DISCOVER !== 'false'
    )
    .then(() => undefined)
    .catch(() => {
      console.error(
        'Beatmap attribute reconciliation failed; retrying on next interval'
      );
    })
    .finally(() => {
      reconciliation = null;
    });
};
await consumer.start(async (message) => {
  const task = (async () => {
    const parsed = ProcessBeatmapAttributesPayloadSchema.safeParse(
      message.payload
    );
    if (!parsed.success) {
      await message.nack(false);
      return;
    }
    await runtime.service.process(parsed.data);
    await message.ack();
  })();
  active.add(task);
  try {
    await task;
  } finally {
    active.delete(task);
  }
});
reconcile();
const timer = setInterval(reconcile, RECONCILE_MS);
const stop = async () => {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await consumer.stop();
  await Promise.allSettled([...active, reconciliation]);
  await runtime.close();
};
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
