import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

interface Props {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, emoji, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  label: { fontSize: 15, color: colors.text, fontWeight: '500' },
  labelSelected: { color: colors.primaryDark, fontWeight: '700' },
});
