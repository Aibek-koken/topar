import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { CITIES } from '@/lib/constants';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function City() {
  const router = useRouter();
  const { t } = useTranslation();
  const city = useOnboardingStore((s) => s.city);
  const setCity = useOnboardingStore((s) => s.setCity);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.step}>{t('onboarding.step', { current: 3, total: 4 })}</Text>
        <Text style={typography.title}>{t('onboarding.cityTitle')}</Text>
        <Text style={typography.subtitle}>{t('onboarding.citySubtitle')}</Text>

        <View style={styles.list}>
          {CITIES.map((name) => {
            const selected = city === name;
            return (
              <Pressable
                key={name}
                onPress={() => setCity(name)}
                style={[styles.row, selected && styles.rowSelected]}>
                <Text style={[styles.rowText, selected && { color: colors.primaryDark, fontWeight: '700' }]}>
                  {name}
                </Text>
                {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          title={t('common.continue')}
          onPress={() => router.push('/(onboarding)/esim-verify')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xxl, gap: spacing.md },
  step: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  list: { gap: spacing.sm, paddingTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowText: { fontSize: 16, color: colors.text },
  footer: { paddingBottom: spacing.xl },
});
