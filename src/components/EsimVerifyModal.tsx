import { useEffect, useState } from 'react';
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

/**
 * Pre-join identity check. Mock mode: staged animation (unchanged).
 * Supabase mode: already verified -> the eSIM connection animation plays as a
 * re-check, then proceeds; not verified -> inline phone OTP form, and the
 * animation plays after a successful confirmation.
 */
export function EsimVerifyModal({ visible, onVerified }: Props) {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const verifiedPhone = useAuthStore((s) => s.verifiedPhone);
  const alreadyVerified = isSupabaseConfigured && !!profile?.esim_verified;

  // Set after the inline OTP succeeds, so the animation plays as the finale.
  const [justVerified, setJustVerified] = useState(false);
  useEffect(() => {
    if (!visible) setJustVerified(false);
  }, [visible]);

  const showChecklist = !isSupabaseConfigured || alreadyVerified || justVerified;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('esim.modalTitle')}</Text>
          <Text style={styles.subtitle}>{t('esim.modalSubtitle')}</Text>

          {showChecklist ? (
            visible && (
              <View style={styles.checklistWrap}>
                <EsimChecklist onDone={onVerified} />
                {isSupabaseConfigured && verifiedPhone && (
                  <Text style={styles.phone}>{maskPhone(verifiedPhone)}</Text>
                )}
              </View>
            )
          ) : (
            <PhoneVerifyForm onVerified={() => setJustVerified(true)} />
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
  checklistWrap: { gap: spacing.md },
  phone: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  concept: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
