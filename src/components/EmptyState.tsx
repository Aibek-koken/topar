import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/lib/theme';

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl * 2, gap: spacing.md },
  emoji: { fontSize: 44 },
  text: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
});
