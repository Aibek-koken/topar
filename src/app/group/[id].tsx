import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EmptyState } from '@/components/EmptyState';
import { EsimVerifyModal } from '@/components/EsimVerifyModal';
import { MarketplaceBadge } from '@/components/MarketplaceBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TierProgressBar } from '@/components/TierProgressBar';
import { formatKZT, formatKztAmount, usdToKzt } from '@/lib/currency';
import { currentTier, discountedUsd, gapToNext, isExpired, nextTier } from '@/lib/groupBuy';
import { lt } from '@/lib/i18n';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function GroupBuyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const { groups, products, joinedIds, join, leave } = useCatalogStore();

  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);

  // The store is updated live by the realtime subscription — this screen
  // re-renders on every participants_count tick automatically
  const group = groups.find((g) => g.id === id);
  const product = group?.product ?? products.find((p) => p.id === group?.product_id);

  const joined = !!group && joinedIds.has(group.id);
  const expired = !!group && isExpired(group);

  const tierRows = useMemo(() => {
    if (!group || !product) return [];
    return [...group.tiers]
      .sort((a, b) => a.min_qty - b.min_qty)
      .map((tier) => ({
        tier,
        price: discountedUsd(product.price_usd, tier),
        active: currentTier(group.tiers, group.participants_count).min_qty === tier.min_qty,
      }));
  }, [group, product]);

  if (!group || !product) {
    return (
      <ScreenContainer>
        <EmptyState emoji="👥" text={t('search.noResults')} />
      </ScreenContainer>
    );
  }

  const tier = currentTier(group.tiers, group.participants_count);
  const priceNowUsd = discountedUsd(product.price_usd, tier);
  const next = nextTier(group.tiers, group.participants_count);
  const gap = gapToNext(group.tiers, group.participants_count);
  const savingsKzt = usdToKzt(product.price_usd) - usdToKzt(priceNowUsd);

  const handleJoinVerified = async () => {
    setVerifying(false);
    if (!userId) return;
    setBusy(true);
    const result = await join(group.id, userId);
    setBusy(false);
    if (result.error) Alert.alert('Topar', `${t('group.error')}: ${result.error}`);
  };

  const handleLeave = async () => {
    if (!userId) return;
    setBusy(true);
    await leave(group.id, userId);
    setBusy(false);
  };

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('group.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.productRow}>
          <Image source={{ uri: product.image_url }} style={styles.image} transition={150} />
          <View style={styles.productInfo}>
            <MarketplaceBadge marketplace={product.marketplace} />
            <Text style={styles.title} numberOfLines={3}>
              {lt(product.title)}
            </Text>
          </View>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>{t('group.currentPrice')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceNow}>{formatKZT(priceNowUsd)}</Text>
            {savingsKzt > 0 && <Text style={styles.priceRetail}>{formatKZT(product.price_usd)}</Text>}
          </View>
          {savingsKzt > 0 && (
            <Text style={styles.savings}>
              💰 {t('product.youSave', { amount: formatKztAmount(savingsKzt) })}
            </Text>
          )}
        </View>

        <View style={styles.progressCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.participants}>
              👥 {t('group.participants', { count: group.participants_count })}
            </Text>
            <Text style={styles.target}>{t('group.target', { count: group.target_qty })}</Text>
          </View>
          <TierProgressBar
            participants={group.participants_count}
            targetQty={group.target_qty}
            tiers={group.tiers}
          />
          <Text style={styles.gapText}>
            {next && gap
              ? t('group.gapToNext', { count: gap, pct: next.discount_pct })
              : `🎉 ${t('group.maxTier')}`}
          </Text>
          <View style={styles.rowBetween}>
            <Text style={styles.deadlineLabel}>{t('group.deadline')}</Text>
            <CountdownTimer deadline={group.deadline} size={15} />
          </View>
        </View>

        <Text style={styles.section}>{t('group.tierLadder')}</Text>
        <View style={styles.ladder}>
          {tierRows.map(({ tier: row, price, active }) => (
            <View key={row.min_qty} style={[styles.ladderRow, active && styles.ladderRowActive]}>
              <Text style={[styles.ladderQty, active && styles.ladderTextActive]}>
                {row.min_qty <= 1 ? t('group.tierOne') : t('group.tierMin', { count: row.min_qty })}
              </Text>
              {row.discount_pct > 0 && (
                <View style={[styles.discountPill, active && styles.discountPillActive]}>
                  <Text style={[styles.discountText, active && { color: '#fff' }]}>
                    −{row.discount_pct}%
                  </Text>
                </View>
              )}
              <Text style={[styles.ladderPrice, active && styles.ladderTextActive]}>
                {formatKZT(price)}
              </Text>
            </View>
          ))}
        </View>

        {joined && (
          <View style={styles.joinedBanner}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.joinedTitle}>{t('group.joined')}</Text>
              <Text style={styles.joinedDesc}>
                {t('group.joinedDesc', { price: formatKZT(priceNowUsd) })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {expired ? (
          <PrimaryButton title={t('group.completed')} disabled onPress={() => {}} />
        ) : joined ? (
          <PrimaryButton title={t('group.leave')} variant="outline" loading={busy} onPress={handleLeave} />
        ) : (
          <PrimaryButton
            title={t('group.join')}
            variant="success"
            loading={busy}
            onPress={() => setVerifying(true)}
          />
        )}
      </View>

      <EsimVerifyModal visible={verifying} onVerified={handleJoinVerified} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  productRow: { flexDirection: 'row', gap: spacing.md },
  image: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.border },
  productInfo: { flex: 1, gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  priceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  priceLabel: { fontSize: 13, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  priceNow: { fontSize: 30, fontWeight: '900', color: colors.success },
  priceRetail: { fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' },
  savings: { fontSize: 14, fontWeight: '700', color: colors.success },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  participants: { fontSize: 15, fontWeight: '800', color: colors.text },
  target: { fontSize: 12.5, color: colors.textMuted },
  gapText: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  deadlineLabel: { fontSize: 13, color: colors.textSecondary },
  section: { fontSize: 16, fontWeight: '800', color: colors.text },
  ladder: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ladderRowActive: { backgroundColor: colors.successSoft },
  ladderQty: { flex: 1, fontSize: 14.5, color: colors.textSecondary },
  ladderTextActive: { color: colors.text, fontWeight: '800' },
  ladderPrice: { fontSize: 15, fontWeight: '700', color: colors.text },
  discountPill: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  discountPillActive: { backgroundColor: colors.success },
  discountText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  joinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  joinedTitle: { fontSize: 15, fontWeight: '800', color: colors.success },
  joinedDesc: { fontSize: 13, color: colors.textSecondary },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
