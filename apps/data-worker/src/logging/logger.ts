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
  if (extra && Object.keys(extra).length > 0) {
    writer.call(console, message, extra);
  } else {
    writer.call(console, message);
  }
};

export const consoleLogger: Logger = {
  info: (message, extra) => log(console.info, message, extra),
  warn: (message, extra) => log(console.warn, message, extra),
  error: (message, extra) => log(console.error, message, extra),
};
