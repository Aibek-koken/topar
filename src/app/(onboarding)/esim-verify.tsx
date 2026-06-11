import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EsimChecklist } from '@/components/EsimChecklist';
import { PhoneVerifyForm } from '@/components/PhoneVerifyForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { currentLang } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function EsimVerify() {
  const router = useRouter();
  const { t } = useTranslation();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  // 'form' -> OTP form; 'animating' -> eSIM connection animation; 'done' -> finished
  const [phase, setPhase] = useState<'form' | 'animating' | 'done'>('form');
  const done = phase === 'done';

  // Writes onboarding data. esim_verified is NOT set here in Supabase mode:
  // confirmPhoneOtp already set it true; skipping leaves it untouched (false
  // for new users, true if verified in an earlier session).
  const completeOnboarding = useCallback(
    async (extra: { esim_verified?: boolean } = {}) => {
      const { interests, budget, city } = useOnboardingStore.getState();
      await updateProfile({
        interests,
        budget_tier: budget,
        city,
        language: currentLang(),
        onboarding_completed: true,
        ...extra,
      });
    },
    [updateProfile]
  );

  // Mock mode: the staged animation marks verified, as before.
  const finishMockVerification = useCallback(async () => {
    await completeOnboarding({ esim_verified: true });
    setPhase('done');
  }, [completeOnboarding]);

  // Real OTP confirmed -> play the eSIM connection animation as the payoff.
  const handleVerified = useCallback(() => {
    setPhase('animating');
  }, []);

  const handleAnimationDone = useCallback(async () => {
    await completeOnboarding();
    setPhase('done');
  }, [completeOnboarding]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  }, [completeOnboarding, router]);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>{t('onboarding.step', { current: 4, total: 4 })}</Text>
        <Text style={typography.title}>{t('esim.title')}</Text>
        <Text style={typography.subtitle}>{t('esim.subtitle')}</Text>

        {!isSupabaseConfigured ? (
          <View style={styles.checklist}>
            <EsimChecklist onDone={finishMockVerification} />
          </View>
        ) : phase === 'form' ? (
          <View style={styles.form}>
            <PhoneVerifyForm onVerified={handleVerified} />
            <Text style={styles.skip} onPress={handleSkip}>
              {t('esim.skip')}
            </Text>
          </View>
        ) : phase === 'animating' ? (
          <View style={styles.checklist}>
            <EsimChecklist onDone={handleAnimationDone} />
          </View>
        ) : null}

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
  form: { paddingTop: spacing.lg, gap: spacing.md },
  skip: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  doneBlock: { gap: spacing.xs, paddingTop: spacing.md },
  doneTitle: { fontSize: 16, fontWeight: '800', color: colors.success },
  doneText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  concept: { fontSize: 11, color: colors.textMuted, paddingTop: spacing.sm },
  footer: { paddingBottom: spacing.xl },
});
