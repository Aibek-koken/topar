import { rapidApiGet } from '../http';
import { httpsUrl, num, salesToNumber, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

const HOST = 'aliexpress-datahub.p.rapidapi.com';

export const aliexpress: SourceAdapter = {
  marketplace: 'aliexpress',
  fetchRaw: (query) =>
    rapidApiGet(HOST, '/item_search_2', { q: query, page: '1', sort: 'salesDesc' }),
  parse(json: any): RawProduct[] {
    const items: any[] = json?.result?.resultList ?? [];
    return items.map((entry) => {
      const item = entry?.item ?? entry;
      return {
        externalId: str(item?.itemId),
        title: str(item?.title),
        priceUsd: num(item?.sku?.def?.promotionPrice ?? item?.sku?.def?.price),
        rating: num(item?.averageStarRate),
        ordersCount: salesToNumber(item?.sales),
        imageUrl: httpsUrl(item?.image),
        productUrl: httpsUrl(item?.itemUrl),
      };
    });
  },
};
