import { connection } from 'next/server';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function endpoint(fn: (request: Request) => Promise<unknown>, status = 200) {
  return async (request: Request) => {
    await connection();
    try {
      return Response.json(await fn(request), { status });
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
      console.error(error);
      return Response.json({ error: 'Unable to complete request' }, { status: 500 });
    }
  };
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try { value = await request.json(); }
  catch { throw new HttpError(400, 'Invalid JSON body'); }
  return object(value);
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Expected an object');
  return value as Record<string, unknown>;
}

export function number(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(400, `Invalid ${name}`);
  }
  return value;
}

export function text(value: unknown, name: string, max = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `Invalid ${name}`);
  return value;
}

export function choice<const T extends string>(value: unknown, options: readonly T[], name: string): T {
  if (!options.includes(value as T)) throw new HttpError(400, `Invalid ${name}`);
  return value as T;
}

export function timestamp(value: unknown, name = 'time') {
  const input = text(value, name, 40);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(input) || !Number.isFinite(Date.parse(input))) {
    throw new HttpError(400, `Invalid ${name}`);
  }
  if (new Date(input.slice(0, 10)).toISOString().slice(0, 10) !== input.slice(0, 10)) throw new HttpError(400, `Invalid ${name}`);
  return new Date(input).toISOString();
}

export function range(params: URLSearchParams, defaultDays = 7) {
  const to = params.has('to') ? timestamp(params.get('to'), 'to') : new Date().toISOString();
  const from = params.has('from') ? timestamp(params.get('from'), 'from') : new Date(Date.parse(to) - defaultDays * 86400000).toISOString();
  if (from >= to) throw new HttpError(400, 'from must precede to');
  return { from, to };
}

export function daysRange(request: Request, fallback: number) {
  const raw = new URL(request.url).searchParams.get('days');
  const days = raw === null ? fallback : Number(raw);
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new HttpError(400, 'days must be an integer from 1 to 366');
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString(), to: new Date().toISOString() };
}

