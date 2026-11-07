import { getSteps } from '@/lib/data';
import { endpoint, range } from '@/lib/http';

export const GET = endpoint(async request => {
  const { from, to } = range(new URL(request.url).searchParams);
  return getSteps(from, to);
});
