import { generatePublicOpenAPISpec } from '@/app/server/openapi';

export async function GET() {
  const spec = await generatePublicOpenAPISpec();

  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}
