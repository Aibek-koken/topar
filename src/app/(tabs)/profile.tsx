import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { GroupBuyCard } from '@/components/GroupBuyCard';
import { RollingNumber } from '@/components/RollingNumber';
import { ScreenContainer } from '@/components/ScreenContainer';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { CATEGORIES } from '@/lib/constants';
import { formatKztAmount } from '@/lib/currency';
import { currentPriceUsd } from '@/lib/groupBuy';
import { savedVsLocalKzt } from '@/lib/pricing';
import { VERIFIED_BONUS_PCT } from '@/lib/trust';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { groups, products, joinedIds } = useCatalogStore();

  const myGroups = useMemo(() => groups.filter((g) => joinedIds.has(g.id)), [groups, joinedIds]);

  // Savings vs. local retail across all joined groups, at the current tier price
  const totalSavedKzt = useMemo(
    () =>
      myGroups.reduce((sum, g) => {
        const product = g.product ?? products.find((p) => p.id === g.product_id);
        if (!product) return sum;
        const paidUsd = currentPriceUsd(product.price_usd, g.tiers, g.participants_count);
        return sum + savedVsLocalKzt(product, paidUsd);
      }, 0),
    [myGroups, products]
  );

  const initials = (profile?.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const interestEmojis = CATEGORIES.filter((c) => profile?.interests?.includes(c.key));

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.display_name}</Text>
          <Text style={styles.meta}>
            📍 {profile?.city ?? '—'}
            {profile?.budget_tier ? `  ·  ${t(`budget.${profile.budget_tier}`)}` : ''}
          </Text>
          <VerifiedBadge verified={!!profile?.esim_verified} />
          {interestEmojis.length > 0 && (
            <View style={styles.interestsRow}>
              {interestEmojis.map(({ key, emoji }) => (
                <View key={key} style={styles.interestChip}>
                  <Text style={styles.interestText}>
                    {emoji} {t(`categories.${key}`)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passport}>
          <View style={styles.passportHeader}>
            <Ionicons name="wallet-outline" size={18} color="#fff" />
            <Text style={styles.passportTitle}>{t('savings.passport')}</Text>
          </View>
          <RollingNumber
            value={totalSavedKzt}
            format={(n) => formatKztAmount(n)}
            style={styles.passportAmount}
          />
          <Text style={styles.passportSub}>
            {totalSavedKzt > 0
              ? t('savings.vsLocal', { city: profile?.city ?? 'Алматы' })
              : t('savings.empty')}
          </Text>
        </LinearGradient>

        {profile?.esim_verified && (
          <View style={styles.trustCard}>
            <View style={styles.trustHeader}>
              <Ionicons name="shield-checkmark" size={20} color={colors.esim} />
              <Text style={styles.trustTitle}>{t('trust.memberTitle')}</Text>
            </View>
            <TrustBenefit icon="flash-outline" text={t('trust.benefitEarly')} />
            <TrustBenefit
              icon="pricetag-outline"
              text={t('trust.benefitBonus', { pct: VERIFIED_BONUS_PCT })}
            />
            <TrustBenefit icon="people-outline" text={t('trust.benefitFair')} />
          </View>
        )}

        <View style={styles.menu}>
          <MenuRow
            icon="language-outline"
            label={t('profile.language')}
            onPress={() => router.push('/profile/language')}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            label={t('profile.simIdentity')}
            onPress={() => router.push('/profile/sim-identity')}
          />
          <MenuRow icon="log-out-outline" label={t('profile.signOut')} onPress={handleSignOut} danger />
        </View>

        <Text style={styles.section}>{t('profile.myGroups')}</Text>
        {myGroups.length === 0 ? (
          <EmptyState emoji="👥" text={t('profile.noGroups')} />
        ) : (
          <View style={styles.groupList}>
            {myGroups.map((g) => (
              <GroupBuyCard key={g.id} group={g} joined />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function TrustBenefit({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon} size={16} color={colors.esim} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textSecondary} />
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13.5, color: colors.textSecondary },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  interestChip: {
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  interestText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  passport: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xs,
    ...shadow.card,
  },
  passportHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  passportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  passportAmount: { fontSize: 34, fontWeight: '900', color: '#fff' },
  passportSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  trustCard: {
    backgroundColor: colors.esimSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trustTitle: { fontSize: 15, fontWeight: '800', color: colors.esim },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { fontSize: 13.5, color: colors.text, flex: 1 },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15.5, color: colors.text, fontWeight: '500' },
  section: { fontSize: 18, fontWeight: '800', color: colors.text },
  groupList: { gap: spacing.md },
});
