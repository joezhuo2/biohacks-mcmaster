import { getClearance } from '@/lib/engine';
import { daysRange, endpoint } from '@/lib/http';

export const GET = endpoint(async request => getClearance(daysRange(request, 90).from));
