import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authErrorKey } from '@/lib/authErrors';
import { colors, radius, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { ErrorBanner } from './ErrorBanner';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  /** Fired after the OTP is confirmed (store already set esim_verified). */
  onVerified: () => void;
}

/**
 * Two-step phone verification: enter number -> enter OTP code.
 * Pure form — no navigation knowledge; parent decides what happens next.
 */
export function PhoneVerifyForm({ onVerified }: Props) {
  const { t } = useTranslation();
  const requestPhoneOtp = useAuthStore((s) => s.requestPhoneOtp);
  const confirmPhoneOtp = useAuthStore((s) => s.confirmPhoneOtp);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await requestPhoneOtp(phone.trim());
    setBusy(false);
    if (err) {
      setError(t(authErrorKey(err)));
      return;
    }
    setStep('code');
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await confirmPhoneOtp(phone.trim(), code.trim());
    setBusy(false);
    if (err) {
      setError(t(authErrorKey(err)));
      setCode(''); // clear for a fresh retry
      return;
    }
    onVerified();
  };

  return (
    <View style={styles.wrap}>
      {step === 'phone' ? (
        <>
          <Text style={styles.label}>{t('esim.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
            placeholder="+7 701 123 45 67"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>{t('esim.phoneHint')}</Text>
          {error && <ErrorBanner message={error} />}
          <PrimaryButton
            title={t('esim.sendCode')}
            loading={busy}
            disabled={phone.replace(/\D/g, '').length < 11}
            onPress={sendCode}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>{t('esim.codeLabel', { phone: phone.trim() })}</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
          />
          {error && <ErrorBanner message={error} />}
          <PrimaryButton
            title={t('esim.confirmCode')}
            loading={busy}
            disabled={code.trim().length < 6}
            onPress={confirm}
          />
          <Text
            style={styles.link}
            onPress={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}>
            {t('esim.changeNumber')}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: spacing.md },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  input: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.text,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontWeight: '800' },
  hint: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
