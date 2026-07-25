import { describe, expect, test } from 'bun:test';
import { GET } from '../route';

const PINNED_SCALAR_CDN =
  'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.5';

describe('Scalar API reference route', () => {
  test('serves a pinned, read-only Scalar reference', async () => {
    const response = GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(html).toContain('<title>o!TR API Reference</title>');
    expect(html).toContain(`<script src="${PINNED_SCALAR_CDN}">`);
    expect(html).not.toContain(
      '<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference">'
    );
    expect(html).toContain('"url": "/spec.json"');
    expect(html).toContain('"theme": "default"');
    expect(html).toContain('"showDeveloperTools": "never"');
    expect(html).toContain('"hideClientButton": true');
    expect(html).toContain('"hideTestRequestButton": true');
    expect(html).toContain('"documentDownloadType": "both"');
    expect(html).toContain('"persistAuth": false');
    expect(html.match(/"disabled": true/g)).toHaveLength(2);
  });
});
