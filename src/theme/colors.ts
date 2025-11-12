/**
 * TimeCapsule Color Theme
 * 
 * Based on modern gradient design with deep black background
 * and vibrant multi-color gradients for interactive elements.
 */

export const Colors = {
  // Primary Background
  background: {
    primary: '#0B0B0B',      // Deep black
    secondary: '#1A1A1A',    // Slightly lighter black
    tertiary: '#2A2A2A',     // Card backgrounds
  },

  // Gradient Colors
  gradient: {
    pink: '#ED62EF',         // Vibrant pink
    purple: '#6A56FF',       // Deep purple
    blue: '#00C9FF',         // Cyan blue
    yellow: '#FFD500',       // Bright yellow (accent/glow)
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',      // White for headlines
    secondary: '#CCCCCC',    // Light grey for secondary text
    tertiary: '#AAAAAA',     // Placeholder text
    muted: '#666666',        // Very subtle text
  },

  // UI Elements
  ui: {
    border: '#333333',       // Dark borders
    divider: '#2A2A2A',      // Dividers between sections
    overlay: 'rgba(11, 11, 11, 0.95)', // Modal overlays
    cardBg: '#1A1A1A',       // Card backgrounds
  },

  // Status Colors
  status: {
    success: '#06D6A0',      // Green for success states
    error: '#FF6B6B',        // Red for errors
    warning: '#FFD166',      // Yellow for warnings
    info: '#00C9FF',         // Blue for info
  },

  // Gradient Definitions (for LinearGradient)
  gradients: {
    primary: ['#ED62EF', '#6A56FF', '#00C9FF'],           // Pink -> Purple -> Blue
    primaryReverse: ['#00C9FF', '#6A56FF', '#ED62EF'],    // Blue -> Purple -> Pink
    accent: ['#FFD500', '#ED62EF'],                        // Yellow -> Pink
    button: ['#ED62EF', '#6A56FF'],                        // Pink -> Purple
    glow: ['rgba(237, 98, 239, 0.3)', 'rgba(106, 86, 255, 0.3)', 'rgba(0, 201, 255, 0.3)'], // Glowing effect
  },

  // Legacy color mapping (for gradual migration)
  legacy: {
    primaryYellow: '#FAC638',
    backgroundLight: '#f8f8f5',
  },
};

// Gradient angle configurations
export const GradientAngles = {
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  radial: { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 1 } },
};

export default Colors;

