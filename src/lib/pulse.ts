import type { GroupBuy, Product } from './types';

export interface PulseEvent {
  id: number;
  name: string;
  city: string;
  product: Product;
  /** True when the event came from a real participants_count tick. */
  real?: boolean;
}

const NAMES = [
  'Айжан',
  'Арман',
  'Дана',
  'Алишер',
  'Камила',
  'Нурлан',
  'Аружан',
  'Диас',
  'Мадина',
  'Санжар',
  'Томирис',
  'Ерасыл',
  'Жибек',
  'Тимур',
  'Асель',
  'Бекзат',
];

const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтөбе', 'Тараз', 'Атырау'];

let seq = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** A synthetic "someone just joined" event, biased to products with live groups. */
export function makePulseEvent(products: Product[], groups: GroupBuy[]): PulseEvent | null {
  const withGroups = groups
    .filter((g) => g.status === 'active')
    .map((g) => g.product ?? products.find((p) => p.id === g.product_id))
    .filter((p): p is Product => !!p);
  const pool = withGroups.length > 0 && Math.random() < 0.75 ? withGroups : products;
  if (pool.length === 0) return null;
  return { id: ++seq, name: pick(NAMES), city: pick(CITIES), product: pick(pool) };
}

export function makeRealPulseEvent(product: Product): PulseEvent {
  return { id: ++seq, name: pick(NAMES), city: pick(CITIES), product, real: true };
}
