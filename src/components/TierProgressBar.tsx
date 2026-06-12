import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/lib/theme';
import type { Tier } from '@/lib/types';

interface Props {
  participants: number;
  targetQty: number;
  tiers: Tier[];
  compact?: boolean;
}

export function TierProgressBar({ participants, targetQty, tiers, compact }: Props) {
  const value = Math.min(participants / targetQty, 1);
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 600,
      useNativeDriver: false, // animating width %
    }).start();
  }, [value, anim]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const markers = tiers.filter((t) => t.min_qty > 1 && t.min_qty <= targetQty);

  return (
    <View>
      <View style={[styles.track, compact && styles.trackCompact]}>
        <Animated.View style={[styles.fill, { width }]} />
        {markers.map((tier) => {
          const left = Math.min((tier.min_qty / targetQty) * 100, 100);
          const atEnd = left >= 99.5; // pin to the edge so the dot never overflows the track
          const reached = participants >= tier.min_qty;
          return (
            <View
              key={tier.min_qty}
              style={[styles.marker, atEnd ? styles.markerEnd : { left: `${left}%` }]}>
              <View style={[styles.dot, reached && styles.dotReached]} />
            </View>
          );
        })}
      </View>
      {!compact && (
        <View style={styles.labels}>
          {markers.map((tier) => {
            const left = Math.min((tier.min_qty / targetQty) * 100, 100);
            const atEnd = left >= 99.5;
            const reached = participants >= tier.min_qty;
            return (
              <Text
                key={tier.min_qty}
                style={[
                  styles.markerLabel,
                  atEnd ? styles.markerLabelEnd : { left: `${left}%` },
                  reached && styles.markerLabelReached,
                ]}>
                −{tier.discount_pct}%
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'visible',
  },
  trackCompact: { height: 6 },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  marker: {
    position: 'absolute',
    top: -2,
    marginLeft: -7,
  },
  markerEnd: { right: 0, marginLeft: 0 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
  },
  dotReached: { borderColor: colors.success },
  labels: { height: 18, marginTop: 4 },
  markerLabel: {
    position: 'absolute',
    marginLeft: -14,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  markerLabelEnd: { right: 0, marginLeft: 0 },
  markerLabelReached: { color: colors.success },
});
