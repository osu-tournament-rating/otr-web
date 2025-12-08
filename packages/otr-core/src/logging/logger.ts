import pino from 'pino';
import type { Logger, LogContext, LogLevel } from './types';

const IGNORED_KEYS = new Set(['level', 'time', 'msg', 'pid', 'hostname']);

const PINO_LEVEL_TO_LABEL: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    if (value.includes(' ') || value.includes('"') || value.length === 0) {
      return JSON.stringify(value);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Error) {
    return JSON.stringify({
      name: value.name,
      message: value.message,
      stack: value.stack,
    });
  }

  return JSON.stringify(value);
}

function formatLogLine(obj: Record<string, unknown>): string {
  const parts: string[] = [];

  if (obj.time) {
    const timestamp =
      typeof obj.time === 'number'
        ? new Date(obj.time).toISOString()
        : String(obj.time);
    parts.push(`timestamp=${timestamp}`);
  }

  if (obj.level != null) {
    const level =
      typeof obj.level === 'number'
        ? (PINO_LEVEL_TO_LABEL[obj.level] ?? String(obj.level))
        : String(obj.level);
    parts.push(`level=${level}`);
  }

  if (obj.service) {
    parts.push(`service=${formatValue(obj.service)}`);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (
      IGNORED_KEYS.has(key) ||
      key === 'service' ||
      key === 'msg' ||
      value === undefined
    ) {
      continue;
    }
    parts.push(`${key}=${formatValue(value)}`);
  }

  if (obj.msg) {
    parts.push(`message=${formatValue(obj.msg)}`);
  }

  return parts.join(' ');
}

const keyValueDestination = (): pino.DestinationStream => ({
  write(chunk: string) {
    try {
      const obj = JSON.parse(chunk) as Record<string, unknown>;
      const formatted = formatLogLine(obj);
      const level = obj.level as number | string;
      const numLevel = typeof level === 'number' ? level : 30;
      const writer = numLevel >= 50 ? console.error : console.info;
      writer(formatted);
    } catch {
      process.stdout.write(chunk);
    }
  },
});

function createPinoLogger(serviceName: string): pino.Logger {
  const level = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

  return pino(
    {
      level,
      base: { service: serviceName },
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: {
        error: (err: unknown) => {
          if (err instanceof Error) {
            return {
              name: err.name,
              message: err.message,
              stack: err.stack,
            };
          }
          return err;
        },
      },
    },
    keyValueDestination()
  );
}

class PinoLoggerWrapper implements Logger {
  private readonly pinoInstance: pino.Logger;

  constructor(pinoInstance: pino.Logger) {
    this.pinoInstance = pinoInstance;
  }

  debug(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.debug(context, message);
    } else {
      this.pinoInstance.debug(message);
    }
  }

  info(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.info(context, message);
    } else {
      this.pinoInstance.info(message);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.warn(context, message);
    } else {
      this.pinoInstance.warn(message);
    }
  }

  error(message: string, context?: LogContext): void {
    if (context) {
      this.pinoInstance.error(context, message);
    } else {
      this.pinoInstance.error(message);
    }
  }

  child(bindings: LogContext): Logger {
    return new PinoLoggerWrapper(this.pinoInstance.child(bindings));
  }
}

export function createLogger(serviceName: string): Logger {
  const pinoInstance = createPinoLogger(serviceName);
  return new PinoLoggerWrapper(pinoInstance);
}
