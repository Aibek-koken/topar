import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.fillAll'));
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const profile = useAuthStore.getState().profile;
    router.replace(profile?.onboarding_completed ? '/(tabs)' : '/(onboarding)/interests');
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <Text style={typography.title}>{t('auth.signInTitle')}</Text>
          <Text style={typography.subtitle}>{t('auth.signInSubtitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton title={t('welcome.signIn')} onPress={submit} loading={loading} />
          <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={styles.link}>{t('auth.noAccount')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { flex: 1, justifyContent: 'center', gap: spacing.md },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.sm },
});
