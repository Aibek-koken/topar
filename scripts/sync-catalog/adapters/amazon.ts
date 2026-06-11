import { rapidApiGet } from '../http';
import { httpsUrl, num, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

const HOST = 'real-time-amazon-data.p.rapidapi.com';

export const amazon: SourceAdapter = {
  marketplace: 'amazon',
  fetchRaw: (query) =>
    rapidApiGet(HOST, '/search', { query, country: 'US', page: '1' }),
  parse(json: any): RawProduct[] {
    const items: any[] = json?.data?.products ?? [];
    return items.map((p) => ({
      externalId: str(p?.asin),
      title: str(p?.product_title),
      priceUsd: num(p?.product_price),
      rating: num(p?.product_star_rating),
      // Amazon exposes no sales count; ratings volume is the closest popularity proxy
      ordersCount: num(p?.product_num_ratings),
      imageUrl: httpsUrl(p?.product_photo),
      productUrl: httpsUrl(p?.product_url),
    }));
  },
};
