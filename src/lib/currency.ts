export const USD_TO_KZT = 512;

// Manual grouping: Intl number formatting is inconsistent across Hermes builds
function groupDigits(n: number): string {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function usdToKzt(usd: number): number {
  // Round to nearest 10 tenge so prices look like real price tags
  return Math.round((usd * USD_TO_KZT) / 10) * 10;
}

export function formatKZT(usd: number): string {
  return `${groupDigits(usdToKzt(usd))} ₸`;
}

export function formatKztAmount(kzt: number): string {
  return `${groupDigits(kzt)} ₸`;
}
