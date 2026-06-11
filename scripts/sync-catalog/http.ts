// Thrown on 429/403 so the orchestrator can stop querying that source
// instead of burning the remaining free-tier quota on guaranteed failures.
export class QuotaError extends Error {}

export async function rapidApiGet(
  host: string,
  path: string,
  params: Record<string, string>
): Promise<unknown> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY is not set in .env');

  const url = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
  });
  if (res.status === 429 || res.status === 403) {
    throw new QuotaError(`${host} quota/auth blocked (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`${host} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}
