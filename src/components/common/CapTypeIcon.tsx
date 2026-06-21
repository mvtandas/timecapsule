import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  /** Solid teardrop instead of outline (clearer at very small sizes). */
  filled?: boolean;
  strokeWidth?: number;
}

// The voorcap.com pin (teardrop) — "one shape, twelve souls". Every cap type
// uses this same mark; only the color (the soul) changes. Path matches the
// brand mark in VoorcapLogo (viewBox 200x280), minus the inner line + dot.
const PIN = 'M 100 18 C 55 18, 22 52, 22 98 C 22 148, 66 190, 100 235 C 134 190, 178 148, 178 98 C 178 52, 145 18, 100 18 Z';

/** Cap-type pin icon, colored per type. Outline by default; `filled` for tiny sizes. */
export const CapTypeIcon: React.FC<Props> = ({ size = 20, color = '#E8633A', filled = false, strokeWidth = 18 }) => {
  const w = (size * 200) / 280; // preserve the teardrop aspect ratio
  return (
    <Svg width={w} height={size} viewBox="0 0 200 280">
      <Path
        d={PIN}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default CapTypeIcon;
