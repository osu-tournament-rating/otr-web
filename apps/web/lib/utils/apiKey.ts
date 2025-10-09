import type {
  ApiKeyMetadata,
  ApiKeyMetadataWithKey,
} from '@/lib/orpc/schema/apiKey';

type ApiKeyPreviewSource = Pick<ApiKeyMetadata, 'prefix' | 'start'> &
  Partial<Pick<ApiKeyMetadataWithKey, 'key'>>;

export const getApiKeyPreview = (metadata: ApiKeyPreviewSource) => {
  const prefix = metadata.prefix?.trim() ?? '';
  const start = metadata.start?.trim() ?? '';

  if (start) {
    const preview =
      prefix && start.startsWith(prefix) ? start : `${prefix}${start}`;
    const normalized = preview.trim();

    return normalized ? `${normalized}…` : '—';
  }

  if (prefix) {
    const normalizedPrefix = prefix.trim();
    return normalizedPrefix ? `${normalizedPrefix}…` : '—';
  }

  const key = metadata.key?.trim() ?? '';
  if (key) {
    const segment = key.slice(0, Math.min(8, key.length));
    return key.length > segment.length ? `${segment}…` : segment;
  }

  return '—';
};
