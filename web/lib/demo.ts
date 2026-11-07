import type { PoolClient } from 'pg';
import { patientId } from './db';

export const demoSources = ['seed', 'sim'];
const tables = ['samples', 'steps', 'events', 'clinic_scores', 'reports'];

export async function clearDemo(client: PoolClient, everything = false) {
  for (const table of tables) {
    await client.query(
      everything ? `DELETE FROM ${table} WHERE patient_id=$1` : `DELETE FROM ${table} WHERE patient_id=$1 AND source = ANY($2)`,
      everything ? [patientId] : [patientId, demoSources],
    );
  }
}
