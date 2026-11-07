import { Pool, type QueryResultRow } from 'pg';

export const patientId = 'alex-chen';
const shared = globalThis as typeof globalThis & { afoPool?: Pool };

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('sslmode');
  // shortcut: TLS on but cert unverified (local network presents a self-signed chain), verify before real patient data
  return shared.afoPool ??= new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 10 });
}

export async function query<T extends QueryResultRow>(sql: string, values: unknown[] = []) {
  return (await db().query<T>(sql, values)).rows;
}
