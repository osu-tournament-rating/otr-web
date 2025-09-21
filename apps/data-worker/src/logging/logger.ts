export interface Logger {
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
}

export const consoleLogger: Logger = {
  info: (message, extra) => console.info(message, extra ?? {}),
  warn: (message, extra) => console.warn(message, extra ?? {}),
  error: (message, extra) => console.error(message, extra ?? {}),
};
