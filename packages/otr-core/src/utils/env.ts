/**
 * An optional environment value, trimmed, or undefined when it is unset or
 * blank, so `KEY=` falls back to the default like a missing key does.
 *
 * Takes the value rather than the name because Next only inlines
 * `process.env.NEXT_PUBLIC_*` when the property is read by name. Keep this
 * module free of Node-only imports: the browser bundle uses it.
 */
export function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
