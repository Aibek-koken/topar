import { rapidApiGet } from '../http';
import { httpsUrl, num, salesToNumber, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

const HOST = 'aliexpress-datahub.p.rapidapi.com';

export const aliexpress: SourceAdapter = {
  marketplace: 'aliexpress',
  fetchRaw: (query) =>
    rapidApiGet(HOST, '/item_search_2', { q: query, page: '1', sort: 'salesDesc' }),
  parse(json: any): RawProduct[] {
    // DataHub reports transient upstream failures inside a 200 response
    // (e.g. code 5008 "data gather failed"). Throw so the orchestrator
    // doesn't cache it and the next run retries the query.
    if (json?.result?.status?.data === 'error') {
      throw new Error(`DataHub error ${json.result.status.code}: ${JSON.stringify(json.result.status.msg)}`);
    }
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
