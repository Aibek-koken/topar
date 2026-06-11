// Fixture-based checks for the sync pipeline. No test framework by design
// (hackathon spec) — run with: npx tsx scripts/sync-catalog/selfcheck.ts
import assert from 'node:assert/strict';
import { aliexpress } from './adapters/aliexpress';
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

// --- aliexpress adapter -------------------------------------------------------
{
  const rows = aliexpress.parse({
    result: {
      resultList: [
        {
          item: {
            itemId: 100500,
            title: 'TWS Earbuds',
            sku: { def: { promotionPrice: 12.34, price: 15.0 } },
            averageStarRate: 4.7,
            sales: '10,000+ sold',
            image: '//ae01.alicdn.com/x.jpg',
            itemUrl: '//www.aliexpress.com/item/100500.html',
          },
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    externalId: '100500',
    title: 'TWS Earbuds',
    priceUsd: 12.34,
    rating: 4.7,
    ordersCount: 10000,
    imageUrl: 'https://ae01.alicdn.com/x.jpg',
    productUrl: 'https://www.aliexpress.com/item/100500.html',
  });
  assert.deepEqual(aliexpress.parse({}), []); // missing/empty response is safe
}

console.log('All checks passed');
