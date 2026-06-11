import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

type Variant = 'primary' | 'outline' | 'success' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: ViewStyle;
}

export function PrimaryButton({ title, onPress, disabled, loading, variant = 'primary', style }: Props) {
  const isOutline = variant === 'outline';
  const bg =
    variant === 'primary' ? colors.primary : variant === 'success' ? colors.success : variant === 'danger' ? colors.danger : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        isOutline && styles.outline,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.label, isOutline && styles.labelOutline]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
  labelOutline: { color: colors.primary },
});
