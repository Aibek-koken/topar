import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, type StyleProp, type TextStyle } from 'react-native';

interface Props {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

/** Animated count-up: the number "rolls" to its new value on every change. */
export function RollingNumber({ value, format, duration = 900, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const fromRef = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const from = fromRef.current;
    anim.setValue(0);
    const id = anim.addListener(({ value: t }) => {
      setDisplay(Math.round(from + (value - from) * t));
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      fromRef.current = value;
      setDisplay(value);
    });
    return () => anim.removeListener(id);
  }, [value, anim, duration]);

  return <Text style={style}>{format ? format(display) : String(display)}</Text>;
}
