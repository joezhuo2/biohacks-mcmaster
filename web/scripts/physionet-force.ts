import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2] ?? '../data/gait-in-neurodegenerative-disease-database-1.0.0';

function decode(bytes: Buffer) {
  const samples: number[] = [];
  for (let i = 0; i + 2 < bytes.length; i += 3) {
    const a = bytes[i] | ((bytes[i + 1] & 15) << 8);
    const b = bytes[i + 2] | ((bytes[i + 1] & 240) << 4);
    samples.push(a >= 2048 ? a - 4096 : a, b >= 2048 ? b - 4096 : b);
  }
  return samples;
}

async function main() {
  const header = (await readFile(join(dir, 'als1.hea'), 'utf8')).trim().split(/\r?\n/);
  const rate = Number(header[0].split(/\s+/)[2]);
  if (rate !== 300 || header.slice(1).some(line => line.split(/\s+/)[1] !== '212')) throw new Error('Unexpected signal format');
  const startSeconds = 22;
  const sampleRate = 100;
  const length = 60 * sampleRate;
  const force = async (file: string) => {
    const raw = decode(await readFile(join(dir, file)));
    const fields = header.find(line => line.startsWith(`${file} `))!.split(/\s+/);
    const checksum = (raw.reduce((a, b) => a + b, 0) << 16) >> 16;
    if (raw.length !== Number(header[0].split(/\s+/)[3]) || checksum !== Number(fields[6])) throw new Error(`Invalid signal in ${file}`);
    const values = Array.from({ length }, (_, i) => {
      const offset = startSeconds * rate + i * 3;
      const valid = raw.slice(offset, offset + 3).filter(value => value !== -2048);
      if (!valid.length) throw new Error(`Missing samples in ${file}`);
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    });
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map(value => Math.round((value - min) / (max - min) * 1000) / 1000);
  };
  const [left, right, timing] = await Promise.all([
    force('als1.let'), force('als1.rit'), readFile(join(dir, 'als1.ts'), 'utf8'),
  ]);
  const strides = timing.trim().split(/\r?\n/).map(line => {
    const row = line.trim().split(/\s+/).map(Number);
    return { time: row[0], left: row[1], right: row[2] };
  }).filter(row => Object.values(row).every(value => Number.isFinite(value) && value > 0));
  const out = { source: 'PhysioNet Gait in Neurodegenerative Disease Database v1.0.0', record: 'als1', sampleRate, startSeconds, left, right, strides };
  const json = JSON.stringify(out);
  await writeFile(new URL('../data/physionet-replay.json', import.meta.url), json);
  console.log({ samples: left.length, seconds: left.length / sampleRate, strides: strides.length, bytes: Buffer.byteLength(json) });
}

void main();
