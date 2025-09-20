/**
 * Represents RabbitMQ-compatible priority values shared between applications.
 */
export enum MessagePriority {
  Low = 0,
  Normal = 5,
  High = 10,
}

export interface MessageMetadata {
  requestedAt: string;
  correlationId: string;
  priority: MessagePriority;
}

const hasRandomUUID = typeof crypto !== 'undefined' && 'randomUUID' in crypto;

function generateCorrelationId(): string {
  if (hasRandomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 implementation when crypto.randomUUID is unavailable
  // Source: https://stackoverflow.com/a/2117523 (adapted for TypeScript)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates metadata for a message envelope, filling defaults for optional fields.
 */
export function createMessageMetadata(
  metadata: Partial<MessageMetadata> = {}
): MessageMetadata {
  const requestedAt = metadata.requestedAt ?? new Date().toISOString();
  const correlationId = metadata.correlationId ?? generateCorrelationId();
  const priority = metadata.priority ?? MessagePriority.Normal;

  return {
    requestedAt,
    correlationId,
    priority,
  };
}
