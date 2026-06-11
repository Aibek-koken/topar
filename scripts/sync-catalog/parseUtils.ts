export function str(v: unknown): string {
  return v == null ? '' : String(v);
}

// "$19.99" -> 19.99, 12.5 -> 12.5, garbage -> null
export function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// "10,000+ sold" -> 10000
export function salesToNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Protocol-relative AliExpress URLs ("//ae01.alicdn.com/...") -> https
export function httpsUrl(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('http')) return s;
  return null;
}
