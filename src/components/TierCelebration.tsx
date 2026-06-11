import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatKZT, formatKztAmount, usdToKzt } from '@/lib/currency';
import { discountedUsd } from '@/lib/groupBuy';
import { lt } from '@/lib/i18n';
import { colors, radius, spacing } from '@/lib/theme';
import { useCelebrationStore } from '@/store/useCelebrationStore';
import { PrimaryButton } from './PrimaryButton';

const CONFETTI_COLORS = ['#FF5A1F', '#16A34A', '#2563EB', '#F59E0B', '#EC4899', '#8B5CF6'];
const PIECES = 36;
const AUTO_DISMISS_MS = 6500;

function ConfettiPiece({ index }: { index: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');

  const cfg = useMemo(() => {
    return {
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 140,
      delay: Math.random() * 500,
      duration: 2300 + Math.random() * 1400,
      rotations: 2 + Math.random() * 3,
      size: 8 + Math.random() * 6,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      round: Math.random() > 0.5,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: cfg.duration,
      delay: cfg.delay,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress, cfg]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, height + 80] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.drift] });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 * cfg.rotations}deg`],
  });
  const opacity = progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: cfg.x,
        width: cfg.size,
        height: cfg.size * (cfg.round ? 1 : 1.8),
        borderRadius: cfg.round ? cfg.size / 2 : 2,
        backgroundColor: cfg.color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

/**
 * Full-screen celebration fired when a group crosses a discount tier
 * (e.g. participant 10/10 unlocks −15%). Mounted once in the root layout.
 */
export function TierCelebration() {
  const { t } = useTranslation();
  const event = useCelebrationStore((s) => s.event);
  const clear = useCelebrationStore((s) => s.clear);

  const priceScale = useRef(new Animated.Value(0.3)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!event) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    priceScale.setValue(0.3);
    cardSlide.setValue(40);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.spring(priceScale, {
        toValue: 1,
        delay: 350,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(clear, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [event, clear, priceScale, cardSlide, cardOpacity]);

  if (!event) return null;

  const { product, fromTier, toTier } = event;
  const oldUsd = discountedUsd(product.price_usd, fromTier);
  const newUsd = discountedUsd(product.price_usd, toTier);
  const savedKzt = usdToKzt(oldUsd) - usdToKzt(newUsd);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={clear}>
      <View style={styles.backdrop}>
        {Array.from({ length: PIECES }, (_, i) => (
          <ConfettiPiece key={`${event.groupId}-${i}`} index={i} />
        ))}
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>{t('celebrate.title')}</Text>
          <Text style={styles.subtitle}>
            {t('celebrate.unlocked', { count: event.participants, pct: toTier.discount_pct })}
          </Text>
          <Text style={styles.product} numberOfLines={2}>
            {lt(product.title)}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.oldPrice}>{formatKZT(oldUsd)}</Text>
            <Text style={styles.arrow}>→</Text>
            <Animated.Text style={[styles.newPrice, { transform: [{ scale: priceScale }] }]}>
              {formatKZT(newUsd)}
            </Animated.Text>
          </View>

          {savedKzt > 0 && (
            <View style={styles.savedPill}>
              <Text style={styles.savedText}>
                💰 {t('celebrate.saved', { amount: formatKztAmount(savedKzt) })}
              </Text>
            </View>
          )}

          <View style={styles.button}>
            <PrimaryButton title={t('celebrate.close')} onPress={clear} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 14, 22, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: { fontSize: 44 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  product: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  oldPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  arrow: { fontSize: 20, color: colors.textMuted },
  newPrice: { fontSize: 32, fontWeight: '900', color: colors.success },
  savedPill: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  savedText: { fontSize: 14, fontWeight: '800', color: colors.success },
  button: { alignSelf: 'stretch', paddingTop: spacing.md },
});
