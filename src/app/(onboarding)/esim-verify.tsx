import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EsimChecklist } from '@/components/EsimChecklist';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { currentLang } from '@/lib/i18n';
import { colors, spacing, typography } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function EsimVerify() {
  const router = useRouter();
  const { t } = useTranslation();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [done, setDone] = useState(false);

  const finishVerification = useCallback(async () => {
    const { interests, budget, city } = useOnboardingStore.getState();
    await updateProfile({
      interests,
      budget_tier: budget,
      city,
      language: currentLang(),
      esim_verified: true,
      onboarding_completed: true,
    });
    setDone(true);
  }, [updateProfile]);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>{t('onboarding.step', { current: 4, total: 4 })}</Text>
        <Text style={typography.title}>{t('esim.title')}</Text>
        <Text style={typography.subtitle}>{t('esim.subtitle')}</Text>

        <View style={styles.checklist}>
          <EsimChecklist onDone={finishVerification} />
        </View>

        {done && (
          <View style={styles.doneBlock}>
            <Text style={styles.doneTitle}>{t('esim.verifiedTitle')}</Text>
            <Text style={styles.doneText}>{t('esim.verifiedSubtitle')}</Text>
          </View>
        )}
        <Text style={styles.concept}>{t('esim.concept')}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={t('common.continue')}
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
  checklist: { paddingTop: spacing.xl },
  doneBlock: { gap: spacing.xs, paddingTop: spacing.md },
  doneTitle: { fontSize: 16, fontWeight: '800', color: colors.success },
  doneText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  concept: { fontSize: 11, color: colors.textMuted, paddingTop: spacing.sm },
  footer: { paddingBottom: spacing.xl },
});
