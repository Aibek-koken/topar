import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { explainScore } from '@/lib/recommendations';
import { colors, radius, spacing } from '@/lib/theme';
import type { GroupBuy, Product } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';

function FactorBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 600, delay, useNativeDriver: false }).start();
  }, [anim, value, delay]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['3%', '100%'] });

  return (
    <View style={styles.factor}>
      <View style={styles.factorRow}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={styles.factorValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width }]} />
      </View>
    </View>
  );
}

interface Props {
  product: Product;
  group?: GroupBuy;
}

/**
 * "✨ 92%" pill that exposes the ranking engine's score for this product.
 * Tapping it opens the explainability sheet with the per-factor breakdown.
 */
export function MatchBadge({ product, group }: Props) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [open, setOpen] = useState(false);

  if (!profile) return null;
  const match = explainScore(product, profile, group);

  return (
    <>
      <Pressable style={styles.badge} onPress={() => setOpen(true)} hitSlop={6}>
        <Ionicons name="sparkles" size={11} color="#fff" />
        <Text style={styles.badgeText}>{match.pct}%</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={styles.bigBadge}>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.bigBadgeText}>{match.pct}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('match.whyTitle')}</Text>
                <Text style={styles.subtitle}>{t('match.whySubtitle')}</Text>
              </View>
            </View>

            <FactorBar label={t('match.interest')} value={match.interest ? 1 : 0.15} delay={100} />
            <FactorBar label={t('match.budget')} value={Math.max(match.budget, 0.1)} delay={220} />
            <FactorBar label={t('match.popularity')} value={match.popularity} delay={340} />
            <FactorBar label={t('match.group')} value={Math.max(match.group, 0.08)} delay={460} />

            {match.hotInCity && !!profile.city && (
              <View style={styles.cityRow}>
                <Ionicons name="flame" size={15} color={colors.primary} />
                <Text style={styles.cityText}>{t('match.hotInCity', { city: profile.city })}</Text>
              </View>
            )}

            <Text style={styles.footer}>{t('match.formula')}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bigBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bigBadgeText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  factor: { gap: 6 },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  factorValue: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cityText: { fontSize: 13.5, fontWeight: '700', color: colors.primaryDark },
  footer: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
