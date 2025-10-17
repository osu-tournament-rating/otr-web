export interface Logger {
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
}

const log = (
  writer: (...args: unknown[]) => void,
  message: string,
  extra?: Record<string, unknown>
) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `timestamp=${timestamp} ${message}`;

  if (extra && Object.keys(extra).length > 0) {
    writer.call(console, formattedMessage, {
      ...extra,
      timestamp,
    });
  } else {
    writer.call(console, formattedMessage);
  }
};

export const consoleLogger: Logger = {
  info: (message, extra) => log(console.info, message, extra),
  warn: (message, extra) => log(console.warn, message, extra),
  error: (message, extra) => log(console.error, message, extra),
};
