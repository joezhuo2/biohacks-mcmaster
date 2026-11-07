import { getStatus } from '@/lib/data';
import { endpoint } from '@/lib/http';

export const GET = endpoint(async () => getStatus());
