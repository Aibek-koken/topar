import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '@/lib/theme';

const STEP_KEYS = ['esim.stepOperator', 'esim.stepProfile', 'esim.stepBinding'] as const;
const STEP_DELAY_MS = 800;

interface Props {
  onDone: () => void;
}

/**
 * Mock staged eSIM verification: each step "runs" for STEP_DELAY_MS, then the
 * final confirmed state shows and onDone fires. Pure UI — no real telecom calls.
 */
export function EsimChecklist({ onDone }: Props) {
  const { t } = useTranslation();
  const [stage, setStage] = useState(0); // 0..2 running step, 3 = done
  const pulse = useRef(new Animated.Value(1)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= STEP_KEYS.length; i++) {
      timers.push(setTimeout(() => setStage(i), i * STEP_DELAY_MS));
    }
    timers.push(setTimeout(() => onDoneRef.current(), STEP_KEYS.length * STEP_DELAY_MS + 700));
    return () => timers.forEach(clearTimeout);
  }, []);

  const done = stage >= STEP_KEYS.length;

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.iconCircle, { transform: [{ scale: done ? 1 : pulse }] }, done && styles.iconCircleDone]}>
        <Ionicons name={done ? 'shield-checkmark' : 'hardware-chip-outline'} size={36} color={done ? colors.success : colors.esim} />
      </Animated.View>
      <View style={styles.steps}>
        {STEP_KEYS.map((key, i) => {
          const stepDone = stage > i;
          const running = stage === i;
          return (
            <View key={key} style={[styles.stepRow, !stepDone && !running && styles.stepPending]}>
              {stepDone ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : running ? (
                <ActivityIndicator size="small" color={colors.esim} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
              )}
              <Text style={[styles.stepText, stepDone && styles.stepTextDone]}>{t(key)}</Text>
            </View>
          );
        })}
        <View style={[styles.stepRow, !done && styles.stepPending]}>
          {done ? (
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          ) : (
            <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
          )}
          <Text style={[styles.stepText, done && styles.stepTextConfirmed]}>{t('esim.stepDone')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.esimSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDone: { backgroundColor: colors.successSoft },
  steps: {
    alignSelf: 'stretch',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepPending: { opacity: 0.4 },
  stepText: { fontSize: 15, color: colors.text },
  stepTextDone: { color: colors.textSecondary },
  stepTextConfirmed: { color: colors.success, fontWeight: '700' },
});
