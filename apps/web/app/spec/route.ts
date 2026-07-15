import { ApiReference } from '@scalar/nextjs-api-reference';

const SCALAR_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.5';

export const GET = ApiReference({
  url: '/spec.json',
  pageTitle: 'o!TR API Reference',
  cdn: SCALAR_CDN_URL,
  showDeveloperTools: 'never',
  hideClientButton: true,
  hideTestRequestButton: true,
  documentDownloadType: 'both',
  persistAuth: false,
  agent: {
    disabled: true,
  },
  mcp: {
    disabled: true,
  },
});
