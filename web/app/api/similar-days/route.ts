import { getSimilarDays } from '@/lib/engine';
import { endpoint } from '@/lib/http';

export const GET = endpoint(async () => getSimilarDays());
