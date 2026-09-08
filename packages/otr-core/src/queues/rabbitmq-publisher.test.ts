import { expect, test } from 'bun:test';
import { RabbitMqPublisher } from './rabbitmq-publisher';

test('closes the channel before the connection so AMQP close handshakes do not race', async () => {
  const order: string[] = [];
  const channel = {
    assertQueue: async () => undefined,
    sendToQueue: () => true,
    waitForConfirms: async () => undefined,
    once: () => undefined,
    close: async () => {
      await Promise.resolve();
      order.push('channel');
    },
  };
  const connection = {
    createConfirmChannel: async () => channel,
    once: () => undefined,
    close: async () => {
      order.push('connection');
    },
  };
  const publisher = new RabbitMqPublisher({
    url: 'unused',
    queue: 'test',
    connectionFactory: async () => connection as never,
  });
  await publisher.publish({});
  await publisher.close();
  expect(order).toEqual(['channel', 'connection']);
});
