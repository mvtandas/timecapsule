/**
 * Color Palette - Gradient Theme
 * 
 * This file contains all the color constants used throughout the app.
 * The color scheme is based on a vibrant gradient theme with pink, purple, blue, and yellow accents.
 */

export const COLORS = {
  // Background
  background: {
    primary: '#0B0B0B',      // Deep black
    secondary: '#1A1A1A',    // Slightly lighter black for cards
    tertiary: '#2A2A2A',     // For elevated surfaces
  },

  // Gradient Colors
  gradient: {
    pink: '#ED62EF',         // Primary pink
    purple: '#6A56FF',       // Primary purple
    blue: '#00C9FF',         // Primary blue
    yellow: '#FFD500',       // Accent yellow for glow/shine
  },

  // Text
  text: {
    primary: '#FFFFFF',      // Headlines
    secondary: '#CCCCCC',    // Secondary text
    tertiary: '#AAAAAA',     // Placeholder text
    muted: '#666666',        // Disabled/muted text
  },

  // Borders
  border: {
    primary: '#333333',
    secondary: '#444444',
  },

  // Status Colors
  status: {
    success: '#06D6A0',
    error: '#FF6B6B',
    warning: '#FFD500',
  },
};

/**
 * Gradient definitions for LinearGradient component
 */
export const GRADIENTS = {
  primary: [COLORS.gradient.pink, COLORS.gradient.purple, COLORS.gradient.blue],
  primaryHorizontal: [COLORS.gradient.pink, COLORS.gradient.purple],
  accent: [COLORS.gradient.purple, COLORS.gradient.blue],
  warm: [COLORS.gradient.pink, COLORS.gradient.yellow],
  cool: [COLORS.gradient.blue, COLORS.gradient.purple],
  shimmer: [COLORS.gradient.pink, COLORS.gradient.purple, COLORS.gradient.blue, COLORS.gradient.yellow],
};

/**
 * Shadow definitions for consistent glow effects
 */
export const SHADOWS = {
  pink: {
    shadowColor: COLORS.gradient.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  purple: {
    shadowColor: COLORS.gradient.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  blue: {
    shadowColor: COLORS.gradient.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

/**
 * Opacity values for consistent transparency
 */
export const OPACITY = {
  overlay: {
    light: 0.15,
    medium: 0.3,
    heavy: 0.6,
  },
  disabled: 0.5,
  pressed: 0.7,
};

