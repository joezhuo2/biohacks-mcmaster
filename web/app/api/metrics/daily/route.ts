import { getDaily } from '@/lib/data';
import { daysRange, endpoint } from '@/lib/http';

export const GET = endpoint(async request => {
  const { from, to } = daysRange(request, 90);
  return getDaily(from, to);
});
