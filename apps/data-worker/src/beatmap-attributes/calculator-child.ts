import { inspectBeatmap, calculateBeatmapAttributes } from './calculator';
import { normalizeCalculationRequests } from '@otr/core/osu/beatmap-attributes';

try {
  const request = JSON.parse(await Bun.stdin.text());
  const bytes = new Uint8Array(Buffer.from(request.bytes, 'base64'));
  const settings = normalizeCalculationRequests(request.settings);
  const source = inspectBeatmap(bytes);
  const results = settings.map((setting) => ({
    settings: setting,
    attributes: calculateBeatmapAttributes(bytes, setting),
  }));
  process.stdout.write(
    JSON.stringify({
      sourceMode: source.mode,
      keyCount: source.keyCount,
      results,
    })
  );
} catch {
  process.exitCode = 1;
}
