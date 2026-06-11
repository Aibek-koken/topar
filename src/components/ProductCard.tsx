import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatKZT } from '@/lib/currency';
import { bestTier, isExpired } from '@/lib/groupBuy';
import { lt } from '@/lib/i18n';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import type { GroupBuy, Product } from '@/lib/types';
import { MarketplaceBadge } from './MarketplaceBadge';

interface Props {
  product: Product;
  group?: GroupBuy;
}

export function ProductCard({ product, group }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const activeGroup = group && !isExpired(group) ? group : undefined;
  const maxDiscount = activeGroup ? bestTier(activeGroup.tiers).discount_pct : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={() => router.push(`/product/${product.id}`)}>
      <View>
        <Image source={{ uri: product.image_url }} style={styles.image} transition={150} />
        <View style={styles.badgeOverlay}>
          <MarketplaceBadge marketplace={product.marketplace} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {lt(product.title)}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.rating}>★ {product.rating.toFixed(1)}</Text>
          <Text style={styles.orders} numberOfLines={1}>
            {t('product.orders', { count: product.orders_count })}
          </Text>
        </View>
        <Text style={styles.price}>{formatKZT(product.price_usd)}</Text>
        {activeGroup && (
          <View style={styles.groupPill}>
            <Text style={styles.groupPillText}>{t('home.groupPill', { pct: maxDiscount })}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  badgeOverlay: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  body: { padding: spacing.md, gap: 4 },
  title: { fontSize: 13.5, fontWeight: '600', color: colors.text, minHeight: 36 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rating: { fontSize: 12, color: colors.warning, fontWeight: '700' },
  orders: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  price: { fontSize: 16, fontWeight: '800', color: colors.text },
  groupPill: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  groupPillText: { fontSize: 11.5, fontWeight: '700', color: colors.success },
});
