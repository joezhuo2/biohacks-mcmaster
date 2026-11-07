import { getHourly } from '@/lib/data';
import { daysRange, endpoint } from '@/lib/http';

export const GET = endpoint(async request => {
  const { from, to } = daysRange(request, 14);
  return getHourly(from, to);
});
