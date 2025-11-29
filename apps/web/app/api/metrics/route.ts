import { NextResponse } from 'next/server';
import { metricsRegistry } from '@/lib/metrics';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.METRICS_AUTH_TOKEN;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const metrics = await metricsRegistry.metrics();
  return new NextResponse(metrics, {
    headers: { 'Content-Type': metricsRegistry.contentType },
  });
}
