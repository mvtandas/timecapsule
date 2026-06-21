import { COLORS as T } from './theme';

/**
 * Backwards-compat shim. The app is migrating to the Voorcap dark design
 * system in src/constants/theme.ts. The legacy COLORS keys below now map to
 * dark equivalents so existing screens shift toward the new look without
 * breaking imports. Port screens to `theme.ts` directly, then remove this file.
 */
export const COLORS = {
  primary: T.ember,
  primaryDark: T.emberDark,
  primaryLight: T.emberSoft,
  background: T.bg,
  backgroundAlt: T.bg2,
  backgroundIOS: T.bg,
  card: T.card,
  text: T.text,
  textSecondary: T.text2,
  textMuted: T.text3,
  textLight: T.text3,
  border: T.border,
  borderLight: T.borderLight,
  success: T.success,
  error: T.danger,
  destructive: T.danger,
  heart: T.ember,
  white: T.white,
  black: T.black,
  overlay: T.overlay,
} as const;
