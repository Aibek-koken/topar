import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RollingNumber } from '@/components/RollingNumber';
import { ScreenContainer } from '@/components/ScreenContainer';
import { CATEGORIES } from '@/lib/constants';
import { formatKztAmount } from '@/lib/currency';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import type { BudgetTier, Category } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';

const SCAN_KEYS = ['dna.scanInterests', 'dna.scanBudget', 'dna.scanGroups'] as const;
const SCAN_STEP_MS = 750;

const NOUN_KEY: Record<Category, string> = {
  electronics: 'dna.nounElectronics',
  fashion: 'dna.nounFashion',
  home: 'dna.nounHome',
  beauty: 'dna.nounBeauty',
  sports: 'dna.nounSports',
};

const ADJ_KEY: Record<BudgetTier, string> = {
  low: 'dna.adjLow',
  mid: 'dna.adjMid',
  high: 'dna.adjHigh',
};

const SAVINGS_BASE: Record<BudgetTier, number> = { low: 96_000, mid: 210_000, high: 480_000 };

function affinityPct(category: string): number {
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) | 0;
  return 86 + (Math.abs(h) % 12);
}

function AffinityBar({ category, emoji, label, delay }: {
  category: Category;
  emoji: string;
  label: string;
  delay: number;
}) {
  const pct = affinityPct(category);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 700,
      delay,
      useNativeDriver: false,
    }).start();
  }, [anim, pct, delay]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['3%', '100%'] });

  return (
    <View style={styles.affinity}>
      <View style={styles.affinityRow}>
        <Text style={styles.affinityLabel}>
          {emoji} {label}
        </Text>
        <Text style={styles.affinityPct}>{pct}%</Text>
      </View>
      <View style={styles.affinityTrack}>
        <Animated.View style={[styles.affinityFill, { width }]} />
      </View>
    </View>
  );
}

/**
 * "AI builds your shopping profile" reveal shown right after eSIM
 * verification: a short staged analysis, then the generated archetype card.
 */
export default function SaudaDna() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  const [stage, setStage] = useState(0); // 0..2 scanning, 3 = reveal
  const pulse = useRef(new Animated.Value(1)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  const interests = profile?.interests?.length ? profile.interests : (['electronics'] as Category[]);
  const budget: BudgetTier = profile?.budget_tier ?? 'mid';
  const city = profile?.city ?? 'Алматы';

  const primary = CATEGORIES.find((c) => c.key === interests[0]) ?? CATEGORIES[0];
  const archetype = `${t(ADJ_KEY[budget])} ${t(NOUN_KEY[primary.key])}`;
  const yearlySavings = SAVINGS_BASE[budget] + (interests.length - 1) * 18_000;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const timers = SCAN_KEYS.map((_, i) =>
      setTimeout(() => setStage(i + 1), (i + 1) * SCAN_STEP_MS)
    );
    timers.push(
      setTimeout(() => {
        setStage(SCAN_KEYS.length);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Animated.spring(reveal, { toValue: 1, friction: 7, useNativeDriver: true }).start();
      }, SCAN_KEYS.length * SCAN_STEP_MS + 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [reveal]);

  const done = stage >= SCAN_KEYS.length;

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>Sauda DNA</Text>
        <Text style={styles.title}>{done ? t('dna.title') : t('dna.analyzing')}</Text>
        <Text style={styles.subtitle}>{t('dna.subtitle')}</Text>

        {!done ? (
          <View style={styles.scanBlock}>
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulse }] }]}>
              <Ionicons name="sparkles" size={36} color={colors.primary} />
            </Animated.View>
            <View style={styles.scanSteps}>
              {SCAN_KEYS.map((key, i) => {
                const stepDone = stage > i;
                const running = stage === i;
                return (
                  <View key={key} style={[styles.scanRow, !stepDone && !running && styles.scanPending]}>
                    {stepDone ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    ) : running ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
                    )}
                    <Text style={styles.scanText}>{t(key, { city })}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.card,
              {
                opacity: reveal,
                transform: [
                  { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                ],
              },
            ]}>
            <Text style={styles.archetypeEmoji}>{primary.emoji}</Text>
            <Text style={styles.archetype}>{archetype}</Text>
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>📍 {city}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{t(`budget.${budget}`)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {interests.slice(0, 3).map((key, i) => {
              const cat = CATEGORIES.find((c) => c.key === key);
              if (!cat) return null;
              return (
                <AffinityBar
                  key={key}
                  category={key}
                  emoji={cat.emoji}
                  label={t(`categories.${key}`)}
                  delay={250 + i * 180}
                />
              );
            })}

            <View style={styles.divider} />

            <Text style={styles.savingsLabel}>{t('dna.savingsLabel')}</Text>
            <RollingNumber
              value={yearlySavings}
              duration={1400}
              format={(n) => formatKztAmount(n)}
              style={styles.savingsValue}
            />
            <Text style={styles.savingsNote}>{t('dna.savingsNote')}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={t('dna.start')}
          disabled={!done}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xxl, gap: spacing.md },
  step: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  scanBlock: { alignItems: 'center', gap: spacing.xl, paddingTop: spacing.xl },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanSteps: {
    alignSelf: 'stretch',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scanPending: { opacity: 0.4 },
  scanText: { fontSize: 15, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadow.card,
  },
  archetypeEmoji: { fontSize: 40 },
  archetype: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  affinity: { alignSelf: 'stretch', gap: 5 },
  affinityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  affinityLabel: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  affinityPct: { fontSize: 13, fontWeight: '800', color: colors.primary },
  affinityTrack: {
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  affinityFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  savingsLabel: { fontSize: 13, color: colors.textSecondary },
  savingsValue: { fontSize: 30, fontWeight: '900', color: colors.success },
  savingsNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  footer: { paddingBottom: spacing.xl },
});
