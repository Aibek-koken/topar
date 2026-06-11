import { rapidApiGet } from '../http';
import { httpsUrl, num, salesToNumber, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

// Temu has no official API and RapidAPI coverage is unstable. HOST and the
// field fallbacks below target the common "Temu API" shape; adjust against
// the cached response after the first live call (Task 9) if needed.
const HOST = 'temu-api.p.rapidapi.com';

// Temu APIs often return price in cents (price_info.price) or a plain number
function priceFrom(g: any): number | null {
  const cents = num(g?.price_info?.price);
  if (cents != null) return cents / 100;
  return num(g?.price ?? g?.min_price);
}

export const temu: SourceAdapter = {
  marketplace: 'temu',
  fetchRaw: (query) => rapidApiGet(HOST, '/search', { keyword: query, page: '1' }),
  parse(json: any): RawProduct[] {
    const items: any[] = json?.data?.items ?? json?.data?.goods_list ?? json?.items ?? [];
    return items.map((g) => ({
      externalId: str(g?.goods_id ?? g?.id),
      title: str(g?.title ?? g?.goods_name),
      priceUsd: priceFrom(g),
      rating: num(g?.goods_score ?? g?.rating),
      ordersCount: salesToNumber(g?.sales_num ?? g?.sales_tip),
      imageUrl: httpsUrl(g?.image ?? g?.thumb_url ?? g?.image_url),
      productUrl: httpsUrl(g?.link_url ?? g?.goods_url),
    }));
  },
};
