import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ScreenContainer';
import { maskPhone } from '@/lib/sim';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';

const STEPS = [
  { icon: 'hardware-chip-outline', titleKey: 'sim.step1Title', textKey: 'sim.step1Text' },
  { icon: 'cellular-outline', titleKey: 'sim.step2Title', textKey: 'sim.step2Text' },
  { icon: 'key-outline', titleKey: 'sim.step3Title', textKey: 'sim.step3Text' },
  { icon: 'people-outline', titleKey: 'sim.step4Title', textKey: 'sim.step4Text' },
] as const;

export default function SimIdentity() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const verifiedPhone = useAuthStore((s) => s.verifiedPhone);
  const verified = !!profile?.esim_verified;

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('sim.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={40} color={colors.esim} />
        </View>
        <Text style={styles.intro}>{t('sim.intro')}</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={verified ? 'shield-checkmark' : 'shield-outline'}
              size={20}
              color={verified ? colors.success : colors.textMuted}
            />
            <Text style={styles.statusTitle}>{t('sim.statusTitle')}</Text>
          </View>
          {verified ? (
            <>
              {verifiedPhone && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{t('sim.statusNumber')}</Text>
                  <Text style={styles.statusValue}>{maskPhone(verifiedPhone)}</Text>
                </View>
              )}
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('sim.statusCarrier')}</Text>
                <Text style={styles.statusValue}>{profile?.sim_carrier ?? '—'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('sim.statusCountry')}</Text>
                <Text style={styles.statusValue}>{profile?.sim_country ?? '—'}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.statusEmpty}>{t('sim.statusNotVerified')}</Text>
          )}
        </View>

        {STEPS.map(({ icon, titleKey, textKey }, i) => (
          <View key={titleKey} style={styles.card}>
            <View style={styles.cardIcon}>
              <Ionicons name={icon} size={22} color={colors.esim} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {i + 1}. {t(titleKey)}
              </Text>
              <Text style={styles.cardText}>{t(textKey)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.roadmap}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.roadmapText}>{t('sim.roadmap')}</Text>
        </View>
      </ScrollView>
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
  content: { paddingBottom: spacing.xxl, gap: spacing.md },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.esimSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  intro: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.esimSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },
  roadmap: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusLabel: { fontSize: 13.5, color: colors.textSecondary },
  statusValue: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  statusEmpty: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },
  roadmapText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
});
