import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS } from './theme';

/**
 * "One shape. Twelve souls." — every cap shares one vessel; the `type` is the
 * soul. This registry is the single, data-driven source for cap types: the
 * create-flow router, map markers, badges, filters, and detail screens all read
 * from it. Adding a V2 type later = flip `enabled` + supply its create/detail
 * components — no schema rewrite (the DB enum already covers all 12).
 *
 * Ported from the Voorcap v14 prototype (CAPS, line ~561) + voorcap.com.
 */

export type CapTypeId =
  | 'whisper' | 'gathering' | 'public' | 'trail' | 'scroll' // launch
  | 'crest' | 'bazaar' | 'arena' | 'moment' | 'scholar' | 'vigil' | 'spark'; // V2

export interface CapType {
  id: CapTypeId;
  name: string;            // display name, e.g. "Whisper"
  soul: string;            // short role label, e.g. "Personal"
  description: string;     // one-line explainer
  color: string;           // accent color
  gradient: readonly [string, string]; // for CTAs / headers
  icon: keyof typeof Ionicons.glyphMap;
  tier: 'launch' | 'v2';
  enabled: boolean;
}

export const CAP_TYPES: Record<CapTypeId, CapType> = {
  // ── Launch (5) ──────────────────────────────────────────────
  whisper: {
    id: 'whisper', name: 'Whisper', soul: 'Personal',
    description: 'A private sealed moment between two people.',
    color: COLORS.ember, gradient: GRADIENTS.ember, icon: 'mail', tier: 'launch', enabled: true,
  },
  gathering: {
    id: 'gathering', name: 'Gathering', soul: 'Collaborative',
    description: 'Many people contribute to one cap.',
    color: COLORS.purple, gradient: GRADIENTS.gathering, icon: 'people', tier: 'launch', enabled: true,
  },
  public: {
    id: 'public', name: 'Public', soul: 'Open to All',
    description: 'A gift to strangers. Anyone nearby can open it.',
    color: COLORS.moss, gradient: GRADIENTS.public, icon: 'earth', tier: 'launch', enabled: true,
  },
  trail: {
    id: 'trail', name: 'Trail', soul: 'Chain',
    description: 'Caps linked in sequence — open one to reveal the next.',
    color: COLORS.gold, gradient: GRADIENTS.trail, icon: 'trail-sign', tier: 'launch', enabled: true,
  },
  scroll: {
    id: 'scroll', name: 'Scroll', soul: 'Informative',
    description: 'Knowledge sealed to a place.',
    color: COLORS.blue, gradient: GRADIENTS.scroll, icon: 'book', tier: 'launch', enabled: true,
  },
  // ── V2 (7) — placeholders; enable when their flows are built ──
  crest: {
    id: 'crest', name: 'Crest', soul: 'Brand',
    description: 'Custom branded caps for businesses.',
    color: '#C0392B', gradient: ['#C0392B', '#962D22'], icon: 'ribbon', tier: 'v2', enabled: false,
  },
  bazaar: {
    id: 'bazaar', name: 'Bazaar', soul: 'Store',
    description: 'A digital storefront at any location.',
    color: '#E67E22', gradient: ['#E67E22', '#C25E12'], icon: 'storefront', tier: 'v2', enabled: false,
  },
  arena: {
    id: 'arena', name: 'Arena', soul: 'Game',
    description: 'Interactive game capsules at physical places.',
    color: '#8E44AD', gradient: ['#8E44AD', '#6F3489'], icon: 'game-controller', tier: 'v2', enabled: false,
  },
  moment: {
    id: 'moment', name: 'Moment', soul: 'Event',
    description: 'Tied to live events; content unlocks after.',
    color: '#D35400', gradient: ['#D35400', '#A84200'], icon: 'sparkles', tier: 'v2', enabled: false,
  },
  scholar: {
    id: 'scholar', name: 'Scholar', soul: 'Education',
    description: 'Teacher & student modes, quiz chains, rewards.',
    color: '#27AE60', gradient: ['#27AE60', '#1E8C4C'], icon: 'school', tier: 'v2', enabled: false,
  },
  vigil: {
    id: 'vigil', name: 'Vigil', soul: 'Legacy',
    description: 'Caps that deliver after years — or after you’re gone.',
    color: '#2C3E50', gradient: ['#2C3E50', '#1B2735'], icon: 'hourglass', tier: 'v2', enabled: false,
  },
  spark: {
    id: 'spark', name: 'Spark', soul: 'Challenge',
    description: 'Task-gated caps — complete a challenge to break the seal.',
    color: '#E8633A', gradient: GRADIENTS.ember, icon: 'flash', tier: 'v2', enabled: false,
  },
};

/** All types in canonical display order. */
export const CAP_TYPE_LIST: CapType[] = [
  'whisper', 'gathering', 'public', 'trail', 'scroll',
  'crest', 'bazaar', 'arena', 'moment', 'scholar', 'vigil', 'spark',
].map((id) => CAP_TYPES[id as CapTypeId]);

/** Only the types currently shippable (the 5 launch types). */
export const LAUNCH_CAP_TYPES: CapType[] = CAP_TYPE_LIST.filter((c) => c.enabled);

export const getCapType = (id?: string | null): CapType => CAP_TYPES[(id as CapTypeId)] || CAP_TYPES.public;

/** Accent color for a cap type id, falling back to ember. */
export const capColor = (id?: string | null): string => getCapType(id).color;
