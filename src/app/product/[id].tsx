import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EmptyState } from '@/components/EmptyState';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TierProgressBar } from '@/components/TierProgressBar';
import { formatKZT, formatKztAmount, usdToKzt } from '@/lib/currency';
import { bestTier, discountedUsd, isExpired } from '@/lib/groupBuy';
import { lt } from '@/lib/i18n';
import { localPriceKzt } from '@/lib/pricing';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { products, groups } = useCatalogStore();
  const profile = useAuthStore((s) => s.profile);

  const product = products.find((p) => p.id === id);
  const group = useMemo(
    () => groups.find((g) => g.product_id === id && !isExpired(g)),
    [groups, id]
  );

  if (!product) {
    return (
      <ScreenContainer>
        <EmptyState emoji="🔍" text={t('search.noResults')} />
      </ScreenContainer>
    );
  }

  const best = group ? bestTier(group.tiers) : null;
  const bestPriceUsd = group && best ? discountedUsd(product.price_usd, best) : null;
  const savingsKzt =
    bestPriceUsd !== null ? usdToKzt(product.price_usd) - usdToKzt(bestPriceUsd) : 0;

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Image source={{ uri: product.image_url }} style={styles.image} transition={200} />
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <MarketplaceBadge marketplace={product.marketplace} />
            <Text style={styles.rating}>★ {product.rating.toFixed(1)}</Text>
            <Text style={styles.orders}>{t('product.orders', { count: product.orders_count })}</Text>
          </View>

          <Text style={styles.title}>{lt(product.title)}</Text>
          <Text style={styles.shipping}>✈️ {t('product.shipping')}</Text>

          <View style={styles.priceCard}>
            <View style={styles.priceRowBetween}>
              <Text style={styles.priceLabel}>
                {t('savings.localPrice', { city: profile?.city ?? 'Алматы' })}
              </Text>
              <Text style={[styles.priceValue, styles.priceStruck]}>
                {formatKztAmount(localPriceKzt(product))}
              </Text>
            </View>
            <View style={styles.priceRowBetween}>
              <Text style={styles.priceLabel}>{t('product.alonePrice')}</Text>
              <Text style={[styles.priceValue, group && styles.priceStruck]}>
                {formatKZT(product.price_usd)}
              </Text>
            </View>
            {group && bestPriceUsd !== null && (
              <>
                <View style={styles.priceRowBetween}>
                  <Text style={[styles.priceLabel, { color: colors.success }]}>
                    {t('product.groupPrice')} (−{best!.discount_pct}%)
                  </Text>
                  <Text style={styles.groupPrice}>{formatKZT(bestPriceUsd)}</Text>
                </View>
                <Text style={styles.savings}>
                  💰 {t('product.youSave', { amount: formatKztAmount(savingsKzt) })}
                </Text>
              </>
            )}
          </View>

          {group ? (
            <View style={styles.groupCard}>
              <View style={styles.priceRowBetween}>
                <Text style={styles.groupCardTitle}>
                  👥 {t('group.participants', { count: group.participants_count })}
                </Text>
                <CountdownTimer deadline={group.deadline} />
              </View>
              <TierProgressBar
                participants={group.participants_count}
                targetQty={group.target_qty}
                tiers={group.tiers}
                compact
              />
            </View>
          ) : (
            <Text style={styles.noGroup}>{t('product.noGroup')}</Text>
          )}

          {product.description && (
            <>
              <Text style={styles.section}>{t('product.description')}</Text>
              <Text style={styles.description}>{lt(product.description)}</Text>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {group ? (
          <PrimaryButton
            title={t('product.joinGroup')}
            variant="success"
            onPress={() => router.push(`/group/${group.id}`)}
          />
        ) : (
          <PrimaryButton
            title={t('product.buyAlone')}
            onPress={() => Alert.alert('Topar', t('product.buyAloneDemo'))}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.border },
  back: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  body: { padding: spacing.lg, gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rating: { fontSize: 13, color: colors.warning, fontWeight: '700' },
  orders: { fontSize: 13, color: colors.textMuted },
  title: { fontSize: 21, fontWeight: '800', color: colors.text, lineHeight: 28 },
  shipping: { fontSize: 13, color: colors.textSecondary },
  priceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  priceRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: { fontSize: 13.5, color: colors.textSecondary },
  priceValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  priceStruck: { textDecorationLine: 'line-through', color: colors.textMuted },
  groupPrice: { fontSize: 22, fontWeight: '900', color: colors.success },
  savings: { fontSize: 13.5, fontWeight: '700', color: colors.success },
  groupCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  groupCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  noGroup: { fontSize: 13, color: colors.textMuted },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, paddingTop: spacing.sm },
  description: { fontSize: 14.5, color: colors.textSecondary, lineHeight: 21 },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
