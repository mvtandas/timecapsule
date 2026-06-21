import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { COLORS, font } from '../../constants/theme';

/**
 * Voorcap brand mark — the pin from voorcap.com (viewBox 200x280):
 * a pin outline + horizontal line + ember dot.
 */
interface MarkProps {
  size?: number;
  /** Stroke color of the pin + line. Defaults to paper/cream (COLORS.text). */
  color?: string;
  /** Center dot color. Defaults to ember. */
  dotColor?: string;
  strokeWidth?: number;
}

export const VoorcapMark: React.FC<MarkProps> = ({
  size = 44,
  color = COLORS.text,
  dotColor = COLORS.ember,
  strokeWidth = 9,
}) => {
  const h = (size * 280) / 200;
  return (
    <Svg width={size} height={h} viewBox="0 0 200 280">
      <Path
        d="M 100 18 C 55 18, 22 52, 22 98 C 22 148, 66 190, 100 235 C 134 190, 178 148, 178 98 C 178 52, 145 18, 100 18 Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={42} y1={118} x2={158} y2={118} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={100} cy={168} r={13} fill={dotColor} />
    </Svg>
  );
};

/**
 * Wordmark: the pin mark + "voorcap" in Fraunces, with "cap" in ember —
 * matching the site's wordmark treatment.
 */
interface WordmarkProps {
  size?: number; // font size of the wordmark
  markSize?: number;
  color?: string;
}

export const VoorcapWordmark: React.FC<WordmarkProps> = ({ size = 28, markSize, color = COLORS.text }) => {
  return (
    <View style={styles.row}>
      <VoorcapMark size={markSize ?? size * 0.95} />
      <Text style={[font('display'), { fontSize: size, color }]}>
        voor<Text style={{ color: COLORS.ember }}>cap</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default VoorcapMark;
