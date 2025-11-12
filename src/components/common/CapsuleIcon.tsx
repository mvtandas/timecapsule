import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

interface CapsuleIconProps {
  size?: number;
  color?: string;
  useGradient?: boolean;
}

export const CapsuleIcon: React.FC<CapsuleIconProps> = ({ 
  size = 24, 
  color,
  useGradient = true,
}) => {
  // Calculate dimensions for a vertical capsule/pill shape
  // Capsule: two semicircles (top and bottom) connected by a rectangle
  const width = size * 0.65; // 65% of size for pill width to make it more pill-like
  const height = size * 0.85; // 85% of size for height to ensure proper spacing
  const radius = width / 2; // Radius of the semicircles
  const centerX = size / 2;
  const startY = (size - height) / 2; // Center vertically
  const topY = startY + radius;
  const bottomY = startY + height - radius;
  
  // Path for a vertical capsule shape
  // Top semicircle: arc from left to right, then rectangle down right side
  // Bottom semicircle: arc from right to left, then rectangle up left side
  const path = `
    M ${centerX - radius} ${topY}
    A ${radius} ${radius} 0 0 1 ${centerX + radius} ${topY}
    L ${centerX + radius} ${bottomY}
    A ${radius} ${radius} 0 0 1 ${centerX - radius} ${bottomY}
    Z
  `;

  const fillColor = color || COLORS.text.tertiary;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {useGradient && !color && (
        <Defs>
          <LinearGradient id="capsuleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.gradient.pink} />
            <Stop offset="50%" stopColor={COLORS.gradient.purple} />
            <Stop offset="100%" stopColor={COLORS.gradient.blue} />
          </LinearGradient>
        </Defs>
      )}
      <Path
        d={path}
        fill={useGradient && !color ? "url(#capsuleGradient)" : fillColor}
      />
    </Svg>
  );
};

