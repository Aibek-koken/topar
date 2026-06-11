import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/lib/theme';

export function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.badge, { backgroundColor: verified ? colors.esimSoft : colors.border }]}>
      <Ionicons
        name={verified ? 'shield-checkmark' : 'shield-outline'}
        size={13}
        color={verified ? colors.esim : colors.textSecondary}
      />
      <Text style={[styles.label, { color: verified ? colors.esim : colors.textSecondary }]}>
        {verified ? t('profile.verified') : t('profile.notVerified')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  label: { fontSize: 12, fontWeight: '600' },
});
