// Fixture-based checks for the sync pipeline. No test framework by design
// (hackathon spec) — run with: npx tsx scripts/sync-catalog/selfcheck.ts
import assert from 'node:assert/strict';
import { aliexpress } from './adapters/aliexpress';
import { amazon } from './adapters/amazon';
import { temu } from './adapters/temu';
import { readCache, writeCache } from './cache';
import { normalize, slugify } from './normalize';
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

// --- amazon adapter -----------------------------------------------------------
{
  const rows = amazon.parse({
    data: {
      products: [
        {
          asin: 'B0TEST',
          product_title: 'Test Product',
          product_price: '$19.99',
          product_star_rating: '4.5',
          product_num_ratings: 1234,
          product_photo: 'https://img/x.jpg',
          product_url: 'https://amazon.com/dp/B0TEST',
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    externalId: 'B0TEST',
    title: 'Test Product',
    priceUsd: 19.99,
    rating: 4.5,
    ordersCount: 1234,
    imageUrl: 'https://img/x.jpg',
    productUrl: 'https://amazon.com/dp/B0TEST',
  });
  assert.deepEqual(amazon.parse({}), []);
}

// --- temu adapter ---------------------------------------------------------------
{
  const rows = temu.parse({
    data: {
      items: [
        {
          goods_id: 601099,
          title: 'Yoga Mat',
          price_info: { price: 1390 },
          sales_num: 2900,
          image: 'https://img.kwcdn.com/x.jpg',
          link_url: 'https://www.temu.com/g-601099.html',
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].externalId, '601099');
  assert.equal(rows[0].priceUsd, 13.9);
  assert.equal(rows[0].ordersCount, 2900);
  assert.deepEqual(temu.parse({}), []);
}

// --- normalize -----------------------------------------------------------------
{
  assert.equal(slugify('Great Thing!! 100% Cotton', 'AB12345'), 'great-thing-100-cotton-b12345');
  assert.equal(slugify('???', 'X1'), 'product-x1');

  const rows = normalize(
    [
      { externalId: 'A1', title: 'Great Thing', priceUsd: 10.456, rating: 4.92, ordersCount: 5.7, imageUrl: 'https://i/x.jpg', productUrl: null },
      { externalId: 'A1', title: 'Duplicate id', priceUsd: 9, rating: 4, ordersCount: 1, imageUrl: 'https://i/y.jpg', productUrl: null },
      { externalId: '', title: 'No id', priceUsd: 10, rating: 4, ordersCount: 5, imageUrl: 'https://i/x.jpg', productUrl: null },
      { externalId: 'A2', title: 'No image', priceUsd: 10, rating: 4, ordersCount: 5, imageUrl: null, productUrl: null },
      { externalId: 'A3', title: 'No price', priceUsd: null, rating: 4, ordersCount: 5, imageUrl: 'https://i/x.jpg', productUrl: null },
    ],
    'sports',
    'temu'
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'great-thing-a1');
  assert.deepEqual(rows[0].title, { ru: 'Great Thing', en: 'Great Thing' });
  assert.equal(rows[0].price_usd, 10.46);
  assert.equal(rows[0].rating, 4.9);
  assert.equal(rows[0].orders_count, 6);
  assert.equal(rows[0].category, 'sports');
  assert.equal(rows[0].marketplace, 'temu');
}

console.log('All checks passed');
