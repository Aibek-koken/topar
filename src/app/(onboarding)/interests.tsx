import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryChip } from '@/components/CategoryChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { CATEGORIES } from '@/lib/constants';
import { spacing, typography, colors } from '@/lib/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function Interests() {
  const router = useRouter();
  const { t } = useTranslation();
  const interests = useOnboardingStore((s) => s.interests);
  const toggleInterest = useOnboardingStore((s) => s.toggleInterest);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>{t('onboarding.step', { current: 1, total: 4 })}</Text>
        <Text style={typography.title}>{t('onboarding.interestsTitle')}</Text>
        <Text style={typography.subtitle}>{t('onboarding.interestsSubtitle')}</Text>

        <View style={styles.chips}>
          {CATEGORIES.map(({ key, emoji }) => (
            <CategoryChip
              key={key}
              emoji={emoji}
              label={t(`categories.${key}`)}
              selected={interests.includes(key)}
              onPress={() => toggleInterest(key)}
            />
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={t('common.continue')}
          disabled={interests.length === 0}
          onPress={() => router.push('/(onboarding)/budget')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xxl, gap: spacing.md },
  step: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  footer: { paddingBottom: spacing.xl },
});
