import { body, endpoint } from '@/lib/http';
import { ingest, parseIngest } from '@/lib/ingest';

export const POST = endpoint(async request => ingest(parseIngest(await body(request))), 201);
