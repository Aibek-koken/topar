import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { BUDGET_TIERS } from '@/lib/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';

const EMOJI = { low: '💸', mid: '💳', high: '💎' } as const;

export default function Budget() {
  const router = useRouter();
  const { t } = useTranslation();
  const budget = useOnboardingStore((s) => s.budget);
  const setBudget = useOnboardingStore((s) => s.setBudget);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>{t('onboarding.step', { current: 2, total: 4 })}</Text>
        <Text style={typography.title}>{t('onboarding.budgetTitle')}</Text>
        <Text style={typography.subtitle}>{t('onboarding.budgetSubtitle')}</Text>

        <View style={styles.cards}>
          {BUDGET_TIERS.map((tier) => {
            const selected = budget === tier;
            return (
              <Pressable
                key={tier}
                onPress={() => setBudget(tier)}
                style={[styles.card, selected && styles.cardSelected]}>
                <Text style={styles.cardEmoji}>{EMOJI[tier]}</Text>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, selected && { color: colors.primaryDark }]}>
                    {t(`budget.${tier}`)}
                  </Text>
                  <Text style={styles.cardRange}>{t(`budget.${tier}Range`)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={t('common.continue')}
          disabled={!budget}
          onPress={() => router.push('/(onboarding)/city')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xxl, gap: spacing.md },
  step: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  cards: { gap: spacing.md, paddingTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardEmoji: { fontSize: 28 },
  cardText: { gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardRange: { fontSize: 13, color: colors.textSecondary },
  footer: { paddingBottom: spacing.xl },
});
