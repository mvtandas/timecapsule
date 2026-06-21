import { TextStyle } from 'react-native';

/**
 * Voorcap design system — single source of truth.
 * Ported from the Voorcap v14 prototype (T + TOKENS objects).
 * "One shape. Twelve souls." — every cap shares one vessel; the type is the soul.
 *
 * RN adaptations vs. the web prototype:
 *  - lineHeight is px here (web used unitless ratios)
 *  - letterSpacing is a number (web used em)
 *  - gradients are exposed as color-stop arrays for expo-linear-gradient
 */

// ── COLORS ──────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds (dark, layered)
  bg: '#0B0E13',
  bg2: '#11151C',
  bg3: '#181E28',
  bg4: '#1F2735',
  card: '#141920',

  // Text
  text: '#EDE8DD',
  text2: 'rgba(237,232,221,0.55)',
  text3: 'rgba(237,232,221,0.28)',

  // Accent — ember is the brand color (whisper)
  ember: '#E8633A',
  emberDark: '#C44A24',
  emberSoft: 'rgba(232,99,58,0.12)',
  emberGlow: 'rgba(232,99,58,0.25)',

  // Cap-type accents
  moss: '#3D9B7A', // public
  gold: '#D4A24C', // trail
  purple: '#7B6CB0', // gathering
  blue: '#3A7BD5', // scroll

  // Lines
  border: 'rgba(237,232,221,0.06)',
  borderLight: 'rgba(237,232,221,0.1)',

  // States
  danger: '#E74C3C',
  success: '#3D9B7A',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.6)',

  // Map
  mapBg: '#0D1117',
  mapGrid: 'rgba(255,255,255,0.035)',
  mapRoad: 'rgba(255,255,255,0.065)',
  mapBlock: '#111620',
} as const;

// Gradient color-stop arrays for <LinearGradient colors={...} />
export const GRADIENTS = {
  ember: ['#E8633A', '#C44A24'],
  gathering: ['#7B6CB0', '#6455A0'],
  trail: ['#D4A24C', '#B8862A'],
  public: ['#3D9B7A', '#2A6B55'],
  scroll: ['#3A7BD5', '#2456A4'],
} as const;

// ── TYPOGRAPHY ──────────────────────────────────────────────────
// Brand typefaces from voorcap.com: Fraunces (display serif) + DM Sans (body).
// Loaded via @expo-google-fonts in App.tsx. RN custom fonts need an explicit
// per-weight family name (numeric fontWeight is ignored), so each token below
// names its exact weighted family and sets fontWeight:'normal' to avoid faux-bold.
const SERIF = 'Fraunces_700Bold';
const SERIF_SEMI = 'Fraunces_600SemiBold';
const SANS = 'DMSans_400Regular';
const SANS_MED = 'DMSans_500Medium';
const SANS_SEMI = 'DMSans_600SemiBold';
const SANS_BOLD = 'DMSans_700Bold';

/** Font families that App.tsx must load before rendering. */
export const REQUIRED_FONTS = [SERIF, SERIF_SEMI, SANS, SANS_MED, SANS_SEMI, SANS_BOLD] as const;

type FontStyle = Required<
  Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'>
> & Pick<TextStyle, 'textTransform'>;

export const FONTS: Record<string, FontStyle> = {
  display: { fontFamily: SERIF, fontSize: 26, fontWeight: 'normal', lineHeight: 30, letterSpacing: -0.26, textTransform: 'none' },
  title: { fontFamily: SERIF, fontSize: 20, fontWeight: 'normal', lineHeight: 24, letterSpacing: -0.1, textTransform: 'none' },
  subtitle: { fontFamily: SERIF_SEMI, fontSize: 16, fontWeight: 'normal', lineHeight: 21, letterSpacing: 0, textTransform: 'none' },
  body: { fontFamily: SANS, fontSize: 13, fontWeight: 'normal', lineHeight: 20, letterSpacing: 0, textTransform: 'none' },
  bodyBold: { fontFamily: SANS_SEMI, fontSize: 13, fontWeight: 'normal', lineHeight: 20, letterSpacing: 0, textTransform: 'none' },
  label: { fontFamily: SANS_SEMI, fontSize: 12, fontWeight: 'normal', lineHeight: 17, letterSpacing: 0, textTransform: 'none' },
  labelBold: { fontFamily: SANS_BOLD, fontSize: 12, fontWeight: 'normal', lineHeight: 17, letterSpacing: 0, textTransform: 'none' },
  caption: { fontFamily: SANS_MED, fontSize: 11, fontWeight: 'normal', lineHeight: 15, letterSpacing: 0, textTransform: 'none' },
  micro: { fontFamily: SANS_SEMI, fontSize: 10, fontWeight: 'normal', lineHeight: 13, letterSpacing: 0.4, textTransform: 'none' },
  eyebrow: { fontFamily: SANS_BOLD, fontSize: 10, fontWeight: 'normal', lineHeight: 13, letterSpacing: 1.4, textTransform: 'uppercase' },
};

/** Return an RN text style for a typography key. */
export const font = (key: keyof typeof FONTS): FontStyle => FONTS[key] || FONTS.body;

export const FONT_FAMILIES = { serif: SERIF, serifSemi: SERIF_SEMI, sans: SANS, sansMed: SANS_MED, sansSemi: SANS_SEMI, sansBold: SANS_BOLD } as const;

// ── SPACING / RADIUS ────────────────────────────────────────────
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const RADIUS = { sm: 8, md: 11, lg: 14, xl: 18, pill: 999 } as const;

// ── SHADOWS (RN elevation-aware) ────────────────────────────────
export const SHADOWS = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  /** Colored glow, e.g. glow(COLORS.ember) for the ember CTA. */
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  }),
} as const;

// ── GLASS (simulated iOS "Liquid Glass") ────────────────────────
// Tokens for translucent, frosted surfaces built from expo-blur + a tinted
// fill + a thin specular edge. Consumed by <GlassView>. Not the native iOS 26
// UIGlassEffect (that needs a dev build) — a close visual nod that runs in Expo Go.
export const GLASS = {
  tint: 'dark' as const,
  intensity: 36, // bars / cards
  intensityStrong: 60, // sticky / near-opaque surfaces
  fill: 'rgba(18,23,31,0.55)', // translucent surface laid over the blur
  fillStrong: 'rgba(11,14,19,0.72)', // sticky tabs (prevents content bleed-through)
  border: 'rgba(237,232,221,0.14)', // thin specular edge
  highlight: 'rgba(255,255,255,0.10)', // top sheen
} as const;

export const THEME = { COLORS, GRADIENTS, FONTS, font, SPACING, RADIUS, SHADOWS, GLASS, FONT_FAMILIES } as const;
export default THEME;
