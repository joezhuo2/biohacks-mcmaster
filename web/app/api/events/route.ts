import { getEvents } from '@/lib/data';
import { choice, endpoint, range } from '@/lib/http';
import { eventTypes } from '@/lib/ingest';

export const GET = endpoint(async request => {
  const params = new URL(request.url).searchParams;
  const { from, to } = range(params);
  const type = params.has('type') ? choice(params.get('type'), eventTypes, 'type') : undefined;
  return getEvents(from, to, type);
});
