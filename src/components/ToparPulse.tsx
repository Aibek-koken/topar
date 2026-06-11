import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { lt } from '@/lib/i18n';
import { makePulseEvent, makeRealPulseEvent, type PulseEvent } from '@/lib/pulse';
import { colors, radius, spacing } from '@/lib/theme';
import { useCatalogStore } from '@/store/useCatalogStore';

const ROTATE_MS = 4200;

/**
 * Live social-proof ticker: synthetic "X from Almaty just joined" events,
 * plus real ones whenever a group's participants_count actually ticks up.
 */
export function ToparPulse() {
  const { t } = useTranslation();
  const products = useCatalogStore((s) => s.products);
  const groups = useCatalogStore((s) => s.groups);

  const [event, setEvent] = useState<PulseEvent | null>(null);
  const slide = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(1)).current;
  const countsRef = useRef<Map<string, number>>(new Map());

  // Pulsing "live" dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);

  // Real joins beat the synthetic rotation
  useEffect(() => {
    const prev = countsRef.current;
    for (const g of groups) {
      const old = prev.get(g.id);
      if (old !== undefined && g.participants_count > old) {
        const product = g.product ?? products.find((p) => p.id === g.product_id);
        if (product) setEvent(makeRealPulseEvent(product));
      }
      prev.set(g.id, g.participants_count);
    }
  }, [groups, products]);

  // Synthetic rotation
  useEffect(() => {
    if (products.length === 0) return;
    setEvent((current) => current ?? makePulseEvent(products, groups));
    const id = setInterval(() => {
      setEvent(makePulseEvent(products, groups));
    }, ROTATE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  // Slide-in on every event change
  useEffect(() => {
    if (!event) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [event, slide]);

  if (!event) return null;

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View style={styles.wrap}>
      <View style={styles.liveBlock}>
        <Animated.View style={[styles.liveDot, { opacity: dot }]} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <Animated.Text
        numberOfLines={1}
        style={[styles.text, { opacity: slide, transform: [{ translateY }] }]}>
        {t('pulse.joined', {
          name: event.name,
          city: event.city,
          product: lt(event.product.title),
        })}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  liveText: { fontSize: 10, fontWeight: '900', color: colors.danger, letterSpacing: 0.5 },
  text: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontWeight: '600' },
});
