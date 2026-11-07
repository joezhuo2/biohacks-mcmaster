import { getReports } from '@/lib/data';
import { generateReport } from '@/lib/gemini';
import { body, choice, endpoint, range, timestamp } from '@/lib/http';

export const GET = endpoint(async request => {
  const params = new URL(request.url).searchParams;
  return getReports(params.has('audience') ? choice(params.get('audience'), ['family', 'physician'], 'audience') : undefined);
});
export const POST = endpoint(async request => {
  const input = await body(request);
  const audience = choice(input.audience, ['family', 'physician'], 'audience');
  const { from, to } = range(new URLSearchParams({ from: timestamp(input.from, 'from'), to: timestamp(input.to, 'to') }));
  return generateReport(audience, from, to);
}, 201);
