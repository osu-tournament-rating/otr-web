import { calculateBeatmapAttributesBatch } from './calculator';

try {
  const request = JSON.parse(await Bun.stdin.text());
  const bytes = new Uint8Array(Buffer.from(request.bytes, 'base64'));
  process.stdout.write(
    JSON.stringify(calculateBeatmapAttributesBatch(bytes, request.settings))
  );
} catch {
  process.exitCode = 1;
}
