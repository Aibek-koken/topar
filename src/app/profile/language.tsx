import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ScreenContainer';
import { setAppLanguage } from '@/lib/i18n';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import type { Lang } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';

const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'ru', label: 'Русский', native: 'Русский' },
  { code: 'kk', label: 'Қазақша', native: 'Қазақ тілі' },
  { code: 'en', label: 'English', native: 'English' },
];

export default function Language() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const select = async (code: Lang) => {
    await setAppLanguage(code);
    await updateProfile({ language: code });
  };

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.list}>
        {LANGS.map(({ code, label, native }) => {
          const active = i18n.language.startsWith(code);
          return (
            <Pressable
              key={code}
              onPress={() => select(code)}
              style={[styles.row, active && styles.rowActive]}>
              <View>
                <Text style={[styles.label, active && { color: colors.primaryDark }]}>{label}</Text>
                <Text style={styles.native}>{native}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
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
  list: { gap: spacing.md, paddingTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  native: { fontSize: 13, color: colors.textSecondary },
});
