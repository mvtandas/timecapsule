import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

/**
 * Pulsing placeholder block. Compose these into content-shaped skeletons so
 * loading states match the layout that's about to appear (better perceived
 * performance than a centered spinner).
 */
export const Skeleton: React.FC<{
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}> = ({ width = '100%', height = 14, radius = RADIUS.sm, style }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.bg3, opacity: pulse }, style]}
    />
  );
};

/** A list-row skeleton: optional leading block + two text lines. */
export const SkeletonRow: React.FC<{ avatar?: 'circle' | 'square'; lines?: number }> = ({
  avatar = 'circle',
  lines = 2,
}) => (
  <View style={styles.row}>
    <Skeleton width={48} height={48} radius={avatar === 'circle' ? 24 : RADIUS.md} />
    <View style={styles.rowBody}>
      <Skeleton width="62%" height={13} />
      {lines > 1 && <Skeleton width="38%" height={11} style={{ marginTop: SPACING.sm }} />}
    </View>
  </View>
);

/** N stacked row skeletons (for FlatList loading states). */
export const SkeletonList: React.FC<{ count?: number; avatar?: 'circle' | 'square' }> = ({
  count = 6,
  avatar = 'circle',
}) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRow key={i} avatar={avatar} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  rowBody: { flex: 1 },
});

export default Skeleton;
