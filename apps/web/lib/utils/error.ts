type MessageCarrier = {
  message?: unknown;
};

const readMessage = (value: unknown): string | null => {
  if (
    value &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as MessageCarrier).message === 'string'
  ) {
    return (value as { message: string }).message;
  }

  return null;
};

export const extractErrorMessage = (error: unknown): string | null => {
  if (typeof error === 'string') {
    return error;
  }

  if (!error || typeof error !== 'object') {
    return null;
  }

  const dataMessage = readMessage((error as { data?: unknown }).data);
  if (dataMessage) {
    return dataMessage;
  }

  const directMessage = readMessage(error);
  if (directMessage) {
    return directMessage;
  }

  return null;
};

export const resolveErrorMessage = (error: unknown, fallback: string): string =>
  extractErrorMessage(error) ?? fallback;
