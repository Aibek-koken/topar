import * as Cellular from 'expo-cellular';
import { Platform } from 'react-native';

export interface SimInfo {
  carrier: string | null;
  country: string | null;
}

// Never throws. Android returns real carrier data; iOS 16+ hides carrier
// info and web has none — those resolve to nulls.
export async function getSimInfo(): Promise<SimInfo> {
  if (Platform.OS === 'web') return { carrier: null, country: null };
  try {
    const [carrier, country] = await Promise.all([
      Cellular.getCarrierNameAsync(),
      Cellular.getIsoCountryCodeAsync(),
    ]);
    return {
      carrier: carrier ?? null,
      country: country ? country.toUpperCase() : null,
    };
  } catch {
    return { carrier: null, country: null };
  }
}

// '77011234567' or '+77011234567' -> '+7 ••• ••• 45 67'
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return phone;
  const last4 = digits.slice(-4);
  return `+${digits[0]} ••• ••• ${last4.slice(0, 2)} ${last4.slice(2)}`;
}
