import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { localPriceKzt } from '@/lib/pricing';
import { verifiedCount, VERIFIED_BONUS_PCT, withVerifiedBonusUsd } from '@/lib/trust';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function GroupBuyDetail() {
  const { id, ref } = useLocalSearchParams<{ id: string; ref?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const { groups, products, joinedIds, join, leave } = useCatalogStore();

  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boosts, setBoosts] = useState(0);
  const boostAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (boosts === 0) return;
    boostAnim.setValue(0);
    Animated.sequence([
      Animated.timing(boostAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(boostAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [boosts, boostAnim]);

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
  const localKzt = localPriceKzt(product);
  const verified = verifiedCount(group);

  const handleJoinVerified = async () => {
    setVerifying(false);
    if (!userId) return;
    setBusy(true);
    const result = await join(group.id, userId);
    setBusy(false);
    if (result.error) Alert.alert('Topar', `${t('group.error')}: ${result.error}`);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleLeave = async () => {
    if (!userId) return;
    setBusy(true);
    await leave(group.id, userId);
    setBusy(false);
  };

  const handleBoost = async () => {
    const message = t('boost.message', {
      product: lt(product.title),
      price: formatKZT(priceNowUsd),
      link: `https://topar.app/group/${group.id}?ref=${userId ?? 'friend'}`,
    });

    if (Platform.OS === 'web') {
      // navigator.share is absent/flaky in desktop browsers — copy instead
      const nav = (globalThis as {
        navigator?: { clipboard?: { writeText(s: string): Promise<void> } };
      }).navigator;
      try {
        await nav?.clipboard?.writeText(message);
        setBoosts((b) => b + 1);
      } catch {
        // clipboard blocked (insecure context / permissions) — nothing to do
      }
      return;
    }

    const result = await Share.share({ message }).catch(() => null);
    if (result?.action === Share.sharedAction) {
      setBoosts((b) => b + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('group.title')}</Text>
          <Pressable style={styles.back} onPress={() => router.push(`/group/${group.id}/chat`)}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        {!!ref && !joined && (
          <View style={styles.invitedBanner}>
            <Text style={styles.invitedText}>🎉 {t('boost.invited')}</Text>
          </View>
        )}

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
          <Text style={styles.localCompare}>
            🏪 {t('savings.localPrice', { city: profile?.city ?? 'Алматы' })}{' '}
            <Text style={styles.localCompareStruck}>{formatKztAmount(localKzt)}</Text>
          </Text>
          {savingsKzt > 0 && (
            <Text style={styles.savings}>
              💰 {t('product.youSave', { amount: formatKztAmount(savingsKzt) })}
            </Text>
          )}
          {profile?.esim_verified && (
            <View style={styles.bonusRow}>
              <Ionicons name="shield-checkmark" size={15} color={colors.esim} />
              <Text style={styles.bonusText}>
                {t('trust.bonusPrice', {
                  pct: VERIFIED_BONUS_PCT,
                  price: formatKZT(withVerifiedBonusUsd(priceNowUsd)),
                })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.participants}>
              👥 {t('group.participants', { count: group.participants_count })}
            </Text>
            <Text style={styles.target}>{t('group.target', { count: group.target_qty })}</Text>
          </View>
          <View>
            <TierProgressBar
              participants={group.participants_count}
              targetQty={group.target_qty}
              tiers={group.tiers}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.boostFloat,
                {
                  opacity: boostAnim,
                  transform: [
                    {
                      translateY: boostAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, -14],
                      }),
                    },
                  ],
                },
              ]}>
              <Text style={styles.boostFloatText}>
                {Platform.OS === 'web' ? t('boost.copied') : t('boost.boosted')}
              </Text>
            </Animated.View>
          </View>
          <Text style={styles.gapText}>
            {next && gap
              ? t('group.gapToNext', { count: gap, pct: next.discount_pct })
              : `🎉 ${t('group.maxTier')}`}
          </Text>
          <View style={styles.verifiedRow}>
            <Ionicons name="shield-checkmark" size={15} color={colors.esim} />
            <Text style={styles.verifiedText}>
              {t('trust.verifiedCount', { verified, total: group.participants_count })}
            </Text>
          </View>
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
        ) : (
          <View style={styles.footerRow}>
            <View style={{ flex: 1 }}>
              {joined ? (
                <PrimaryButton
                  title={t('group.leave')}
                  variant="outline"
                  loading={busy}
                  onPress={handleLeave}
                />
              ) : (
                <PrimaryButton
                  title={t('group.join')}
                  variant="success"
                  loading={busy}
                  onPress={() => setVerifying(true)}
                />
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.boostButton, pressed && { opacity: 0.8 }]}
              onPress={handleBoost}>
              <Ionicons name="rocket" size={20} color="#fff" />
              <Text style={styles.boostButtonText}>{t('boost.button')}</Text>
            </Pressable>
          </View>
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
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  invitedBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  invitedText: { fontSize: 13.5, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
  localCompare: { fontSize: 13, color: colors.textSecondary },
  localCompareStruck: { textDecorationLine: 'line-through', color: colors.textMuted },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.esimSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  bonusText: { fontSize: 12.5, fontWeight: '700', color: colors.esim },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontSize: 13, fontWeight: '600', color: colors.esim },
  boostFloat: { position: 'absolute', right: 0, top: -18 },
  boostFloatText: { fontSize: 13, fontWeight: '900', color: colors.primary },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  boostButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
