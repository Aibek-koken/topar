import { StyleSheet, Text, View } from 'react-native';
import { MARKETPLACES } from '@/lib/constants';
import { radius } from '@/lib/theme';
import type { Marketplace } from '@/lib/types';

export function MarketplaceBadge({ marketplace }: { marketplace: Marketplace }) {
  const meta = MARKETPLACES[marketplace];
  return (
    <View style={[styles.badge, { backgroundColor: meta.color }]}>
      <Text style={[styles.label, { color: meta.textColor }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700' },
});
