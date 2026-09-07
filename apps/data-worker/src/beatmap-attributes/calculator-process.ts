import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { CalculationSettings } from '@otr/core/osu/beatmap-attributes';
import type { calculateBeatmapAttributes } from './calculator';
import { CALCULATOR_MEMORY_BYTES, CALCULATOR_TIMEOUT_MS } from './policy';

type Calculated = ReturnType<typeof calculateBeatmapAttributes>;
export interface CalculationBatch {
  sourceMode: number;
  keyCount: number | null;
  results: Array<{ settings: CalculationSettings; attributes: Calculated }>;
}

export class CalculatorProcessError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean
  ) {
    super(code);
  }
}

export async function calculateInProcess(
  bytes: Uint8Array,
  settings: CalculationSettings[]
): Promise<CalculationBatch> {
  if (process.platform !== 'linux')
    throw new CalculatorProcessError(
      'calculator_requires_linux_memory_monitor',
      false
    );
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env };
    for (const key of Object.keys(childEnv)) {
      if (key !== 'PATH' && key !== 'NODE_ENV')
        Reflect.deleteProperty(childEnv, key);
    }
    const child = spawn(
      process.execPath,
      [
        '--smol',
        'run',
        new URL('./calculator-child.ts', import.meta.url).pathname,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'], env: childEnv }
    );
    const chunks: Buffer[] = [];
    let length = 0;
    let failure: CalculatorProcessError | null = null;
    const kill = (code: string) => {
      failure ??= new CalculatorProcessError(code, true);
      child.kill('SIGKILL');
    };
    const deadline = setTimeout(
      () => kill('calculator_timeout'),
      CALCULATOR_TIMEOUT_MS
    );
    const memory = setInterval(() => {
      if (!child.pid) return;
      void readFile(`/proc/${child.pid}/status`, 'utf8')
        .then((status) => {
          const kb = Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0);
          if (kb * 1024 > CALCULATOR_MEMORY_BYTES)
            kill('calculator_memory_limit');
        })
        .catch(() => undefined);
    }, 100);
    child.stdout.on('data', (chunk: Buffer) => {
      length += chunk.length;
      if (length > 1024 * 1024) kill('calculator_output_limit');
      else chunks.push(chunk);
    });
    child.stderr.resume();
    child.stdin.on('error', () => undefined);
    child.once('error', () => {
      clearTimeout(deadline);
      clearInterval(memory);
      reject(new CalculatorProcessError('calculator_start_failed', true));
    });
    child.once('close', (code) => {
      clearTimeout(deadline);
      clearInterval(memory);
      if (failure) return reject(failure);
      if (code !== 0)
        return reject(
          new CalculatorProcessError('invalid_beatmap_calculation', false)
        );
      try {
        resolve(
          JSON.parse(Buffer.concat(chunks).toString('utf8')) as CalculationBatch
        );
      } catch {
        reject(new CalculatorProcessError('invalid_calculator_response', true));
      }
    });
    child.stdin.end(
      JSON.stringify({ bytes: Buffer.from(bytes).toString('base64'), settings })
    );
  });
}
