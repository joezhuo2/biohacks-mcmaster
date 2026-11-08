import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { db } from '../lib/db';
import { refreshRollups } from '../lib/engine';

async function main() {
  await db().query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await refreshRollups();
  await db().end();
  console.log('Database schema ready.');
}
void main();
