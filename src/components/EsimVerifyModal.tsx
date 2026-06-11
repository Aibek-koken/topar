import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { EsimChecklist } from './EsimChecklist';

interface Props {
  visible: boolean;
  onVerified: () => void;
}

/** Mock eSIM re-verification shown before joining a group buy. */
export function EsimVerifyModal({ visible, onVerified }: Props) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('esim.modalTitle')}</Text>
          <Text style={styles.subtitle}>{t('esim.modalSubtitle')}</Text>
          {visible && <EsimChecklist onDone={onVerified} />}
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
  concept: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
