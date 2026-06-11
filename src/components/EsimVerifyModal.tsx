import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { maskPhone } from '@/lib/sim';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { EsimChecklist } from './EsimChecklist';
import { PhoneVerifyForm } from './PhoneVerifyForm';

interface Props {
  visible: boolean;
  onVerified: () => void;
}

const CONFIRMED_AUTOCLOSE_MS = 1400;

/**
 * Pre-join identity check. Mock mode: staged animation (unchanged).
 * Supabase mode: already verified -> brief confirmed card, then proceeds;
 * not verified -> inline phone OTP form.
 */
export function EsimVerifyModal({ visible, onVerified }: Props) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const verifiedPhone = useAuthStore((s) => s.verifiedPhone);
  const alreadyVerified = isSupabaseConfigured && !!profile?.esim_verified;

  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  useEffect(() => {
    if (!visible || !alreadyVerified) return;
    const tm = setTimeout(() => onVerifiedRef.current(), CONFIRMED_AUTOCLOSE_MS);
    return () => clearTimeout(tm);
  }, [visible, alreadyVerified]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('esim.modalTitle')}</Text>
          <Text style={styles.subtitle}>{t('esim.modalSubtitle')}</Text>

          {!isSupabaseConfigured ? (
            visible && <EsimChecklist onDone={onVerified} />
          ) : alreadyVerified ? (
            <View style={styles.confirmed}>
              <View style={styles.confirmedIcon}>
                <Ionicons name="shield-checkmark" size={36} color={colors.success} />
              </View>
              <Text style={styles.confirmedTitle}>{t('esim.confirmedTitle')}</Text>
              {verifiedPhone && <Text style={styles.confirmedPhone}>{maskPhone(verifiedPhone)}</Text>}
              {profile?.sim_carrier && <Text style={styles.confirmedMeta}>{profile.sim_carrier}</Text>}
            </View>
          ) : (
            <PhoneVerifyForm onVerified={onVerified} />
          )}

          <Text style={styles.concept}>{t('esim.concept')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center' },
  confirmed: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  confirmedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTitle: { fontSize: 16, fontWeight: '800', color: colors.success },
  confirmedPhone: { fontSize: 15, fontWeight: '700', color: colors.text },
  confirmedMeta: { fontSize: 13, color: colors.textSecondary },
  concept: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
