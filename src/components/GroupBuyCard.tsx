import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatKZT } from '@/lib/currency';
import { currentPriceUsd, isExpired } from '@/lib/groupBuy';
import { lt } from '@/lib/i18n';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import type { GroupBuy } from '@/lib/types';
import { CountdownTimer } from './CountdownTimer';
import { TierProgressBar } from './TierProgressBar';

interface Props {
  group: GroupBuy;
  joined?: boolean;
}

export function GroupBuyCard({ group, joined }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const product = group.product;
  if (!product) return null;

  const expired = isExpired(group);
  const groupPrice = currentPriceUsd(product.price_usd, group.tiers, group.participants_count);
  const hasDiscount = groupPrice < product.price_usd;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, expired && styles.expired]}
      onPress={() => router.push(`/group/${group.id}`)}>
      <View style={styles.topRow}>
        <Image source={{ uri: product.image_url }} style={styles.image} transition={150} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {lt(product.title)}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.groupPrice}>{formatKZT(groupPrice)}</Text>
            {hasDiscount && <Text style={styles.retailPrice}>{formatKZT(product.price_usd)}</Text>}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.participants}>
              👥 {t('group.participants', { count: group.participants_count })}
            </Text>
            <CountdownTimer deadline={group.deadline} size={12} />
          </View>
        </View>
        {joined && (
          <View style={styles.joinedPill}>
            <Text style={styles.joinedPillText}>✓</Text>
          </View>
        )}
      </View>
      <TierProgressBar
        participants={group.participants_count}
        targetQty={group.target_qty}
        tiers={group.tiers}
        compact
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  expired: { opacity: 0.55 },
  topRow: { flexDirection: 'row', gap: spacing.md },
  image: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.border },
  info: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  groupPrice: { fontSize: 17, fontWeight: '800', color: colors.success },
  retailPrice: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  participants: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  joinedPill: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
