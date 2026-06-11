import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCountdown } from '@/hooks/useCountdown';
import { colors } from '@/lib/theme';

const pad = (n: number) => String(n).padStart(2, '0');

export function CountdownTimer({ deadline, size = 13 }: { deadline: string; size?: number }) {
  const { t } = useTranslation();
  const c = useCountdown(deadline);

  if (c.expired) {
    return (
      <View style={styles.row}>
        <Ionicons name="time-outline" size={size + 1} color={colors.textMuted} />
        <Text style={[styles.text, { fontSize: size, color: colors.textMuted }]}>{t('group.completed')}</Text>
      </View>
    );
  }

  const urgent = c.days === 0 && c.hours < 6;
  const color = urgent ? colors.danger : colors.textSecondary;
  const label =
    c.days > 0
      ? `${c.days}${t('countdown.d')} ${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`
      : `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;

  return (
    <View style={styles.row}>
      <Ionicons name="time-outline" size={size + 1} color={color} />
      <Text style={[styles.text, { fontSize: size, color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
