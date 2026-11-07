import 'dotenv/config';
import { db } from '../lib/db';
import { clearDemo } from '../lib/demo';

async function main() {
  const everything = process.argv.includes('--all');
  const client = await db().connect();
  try {
    await clearDemo(client, everything);
  } finally {
    client.release();
  }
  await db().query("CALL refresh_continuous_aggregate('steps_1h', NULL, NULL)");
  await db().query("CALL refresh_continuous_aggregate('steps_1d', NULL, NULL)");
  console.log(everything ? 'Deleted all rows for the patient.' : 'Deleted seed and simulator rows; real Pi data kept.');
}

void main().finally(() => db().end());
