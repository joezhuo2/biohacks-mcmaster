import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2] ?? '../data/gait-in-neurodegenerative-disease-database-1.0.0';

async function rightStrides(file: string) {
  const text = await readFile(join(dir, file), 'utf8');
  return text.trim().split('\n')
    .map(line => Math.round(Number(line.trim().split(/\s+/)[2]) * 1000))
    .filter(ms => ms >= 600 && ms <= 2500);
}

const cv = (xs: number[]) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) / mean;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function main() {
  const files = (await readdir(dir)).filter(f => f.endsWith('.ts'));
  const group = async (prefix: string) => Promise.all(files.filter(f => new RegExp(`^${prefix}\\d+\\.ts$`).test(f)).map(rightStrides));
  const [als, control] = await Promise.all([group('als'), group('control')]);
  const out = {
    source: 'PhysioNet Gait in Neurodegenerative Disease Database v1.0.0 (Hausdorff et al.), right-foot stride intervals',
    alsStrideCv: median(als.map(cv)),
    controlStrideCv: median(control.map(cv)),
    als,
  };
  await writeFile(new URL('../data/physionet-strides.json', import.meta.url), JSON.stringify(out));
  console.log({ alsSubjects: als.length, controlSubjects: control.length, alsStrideCv: out.alsStrideCv, controlStrideCv: out.controlStrideCv, strides: als.flat().length });
}
void main();
