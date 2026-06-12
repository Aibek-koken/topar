import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

interface Props {
  message: string;
}

/** Inline form error: icon + text, so the state isn't conveyed by color alone. */
export function ErrorBanner({ message }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { flex: 1, fontSize: 13.5, color: colors.danger, lineHeight: 19, fontWeight: '600' },
});
