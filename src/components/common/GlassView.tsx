import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GLASS, RADIUS } from '../../constants/theme';

interface Props {
  children?: React.ReactNode;
  /** Blur strength (0–100). Defaults to GLASS.intensity. */
  intensity?: number;
  /** Translucent fill laid over the blur. Defaults to GLASS.fill. */
  fill?: string;
  /** Corner radius. Defaults to RADIUS.lg. */
  radius?: number;
  /** Specular edge color. Defaults to GLASS.border. Pass 'transparent' to drop it. */
  borderColor?: string;
  /** Show the top highlight sheen that sells the glass look. */
  sheen?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable "Liquid Glass" surface: a frosted blur + tinted fill + thin specular
 * edge (+ optional top sheen). On Android, BlurView is weaker, so the tinted
 * fill carries the look and `experimentalBlurMethod` improves the blur.
 * Place over content you want to show through (maps, lists) for the full effect.
 */
const GlassView: React.FC<Props> = ({
  children,
  intensity = GLASS.intensity,
  fill = GLASS.fill,
  radius = RADIUS.lg,
  borderColor = GLASS.border,
  sheen = true,
  style,
}) => (
  <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor }, style]}>
    <BlurView
      tint={GLASS.tint}
      intensity={intensity}
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      style={StyleSheet.absoluteFill}
    />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
    {sheen && (
      <LinearGradient
        colors={[GLASS.highlight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.sheen}
        pointerEvents="none"
      />
    )}
    {children}
  </View>
);

const styles = StyleSheet.create({
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
});

export default GlassView;
