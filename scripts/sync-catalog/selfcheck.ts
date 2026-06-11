// Fixture-based checks for the sync pipeline. No test framework by design
// (hackathon spec) — run with: npx tsx scripts/sync-catalog/selfcheck.ts
import assert from 'node:assert/strict';
import { readCache, writeCache } from './cache';
import { httpsUrl, num, salesToNumber, str } from './parseUtils';

// --- parseUtils -------------------------------------------------------------
assert.equal(num('$19.99'), 19.99);
assert.equal(num(12.5), 12.5);
assert.equal(num('not a price'), null);
assert.equal(salesToNumber('10,000+ sold'), 10000);
assert.equal(salesToNumber(undefined), null);
assert.equal(httpsUrl('//ae01.alicdn.com/x.jpg'), 'https://ae01.alicdn.com/x.jpg');
assert.equal(httpsUrl('https://img/x.jpg'), 'https://img/x.jpg');
assert.equal(httpsUrl(''), null);
assert.equal(str(123), '123');
assert.equal(str(null), '');

// --- cache roundtrip ----------------------------------------------------------
writeCache('selfcheck', 'roundtrip query', { ok: true, n: 1 });
assert.deepEqual(readCache('selfcheck', 'roundtrip query'), { ok: true, n: 1 });
assert.equal(readCache('selfcheck', 'never written'), null);

console.log('All checks passed');
