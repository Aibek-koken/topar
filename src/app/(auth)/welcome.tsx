import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { setAppLanguage } from '@/lib/i18n';
import { colors, radius, spacing } from '@/lib/theme';
import type { Lang } from '@/lib/types';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'ru', label: 'РУС' },
  { code: 'kk', label: 'ҚАЗ' },
  { code: 'en', label: 'ENG' },
];

export default function Welcome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  return (
    <ScreenContainer>
      <View style={styles.langRow}>
        {LANGS.map(({ code, label }) => {
          const active = i18n.language.startsWith(code);
          return (
            <Pressable
              key={code}
              onPress={() => setAppLanguage(code)}
              style={[styles.langPill, active && styles.langPillActive]}>
              <Text style={[styles.langText, active && styles.langTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🛍️</Text>
        </View>
        <Text style={styles.brand}>Topar</Text>
        <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
        <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title={t('welcome.signUp')} onPress={() => router.push('/(auth)/sign-up')} />
        <PrimaryButton
          title={t('welcome.signIn')}
          variant="outline"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  langPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  langTextActive: { color: '#fff' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoEmoji: { fontSize: 44 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  tagline: { fontSize: 19, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
});
