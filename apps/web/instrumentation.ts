export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTracing } = await import('@otr/core/tracing');
    startTracing({ serviceName: 'otr-web' });
  }
}
