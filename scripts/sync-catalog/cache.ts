import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = join(__dirname, '..', '.cache');

function cachePath(source: string, query: string): string {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return join(CACHE_DIR, source, `${slug}.json`);
}

export function readCache(source: string, query: string): unknown | null {
  const p = cachePath(source, query);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function writeCache(source: string, query: string, data: unknown): void {
  const p = cachePath(source, query);
  mkdirSync(join(CACHE_DIR, source), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
