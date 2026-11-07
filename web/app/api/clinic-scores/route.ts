import { addClinicScore, getClinicScores } from '@/lib/data';
import { body, endpoint, HttpError, number, text, timestamp } from '@/lib/http';
import type { ClinicScore } from '@/lib/types';

export const GET = endpoint(async () => getClinicScores());
export const POST = endpoint(async request => {
  const input = await body(request);
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new HttpError(400, 'date must be YYYY-MM-DD');
  const date = timestamp(input.date, 'date').slice(0, 10);
  if (date !== input.date) throw new HttpError(400, 'Invalid date');
  const score: Omit<ClinicScore, 'id'> = { date };
  if (input.alsfrsR !== undefined) {
    score.alsfrsR = number(input.alsfrsR, 'alsfrsR', 0, 48);
    if (!Number.isInteger(score.alsfrsR)) throw new HttpError(400, 'alsfrsR must be an integer');
  }
  if (input.walk10mSec !== undefined) score.walk10mSec = number(input.walk10mSec, 'walk10mSec', 0.01, 3600);
  if (input.note !== undefined) score.note = text(input.note, 'note', 5000);
  if (score.alsfrsR === undefined && score.walk10mSec === undefined) throw new HttpError(400, 'At least one clinic score is required');
  return addClinicScore(score);
}, 201);
