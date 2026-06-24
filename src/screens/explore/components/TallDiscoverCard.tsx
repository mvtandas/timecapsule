import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import { getMediaUrl, isLocked } from '../../../utils/mediaUtils';
import { formatDate } from '../../../utils/dateUtils';
import CapTypeIcon from '../../../components/common/CapTypeIcon';
import { useT } from '../../../i18n';

/** Translate function shape returned by useT(). */
export type TFn = (key: string, opts?: object) => string;

interface Props {
  cap: any;
  saved: boolean;
  onToggleSave: (cap: any) => void;
  onPress: (cap: any) => void;
}

/** Visual tone of a timing badge — drives its color. */
export type CapTimingTone = 'locked' | 'soon' | 'open';

/** Shape of a computed timing badge for a cap. */
export interface CapTimingBadge {
  /** Translated label to render. */
  label: string;
  /** True only while the cap is still sealed (open_at in the future). */
  locked: boolean;
  /** Tone, mapped to a color via TIMING_TONE_COLORS. */
  tone: CapTimingTone;
}

/** Tone → color, mirroring the demo's TIMING_TONE_COLORS. */
export const TIMING_TONE_COLORS: Record<CapTimingTone, string> = {
  locked: COLORS.gold,
  soon: COLORS.ember,
  open: COLORS.moss,
};

const EXPIRING_SOON_MS = 48 * 60 * 60 * 1000;

/**
 * Compute the timing badge for a cap, mirroring the demo:
 *  - open_at in the future  → lock + "Opens <date>"  (gold)
 *  - expires_at within ~48h → "Expiring soon"        (ember)
 *  - otherwise              → "Open now"             (moss)
 * Shared by TallDiscoverCard and TrendingRow.
 */
export const computeCapTimingBadge = (cap: any, t: TFn): CapTimingBadge => {
  const now = Date.now();
  if (isLocked(cap?.open_at)) {
    return { label: t('capDetail.opens', { date: formatDate(cap.open_at) }), locked: true, tone: 'locked' };
  }
  const expiresAt = cap?.expires_at ? new Date(cap.expires_at).getTime() : NaN;
  if (!Number.isNaN(expiresAt) && expiresAt - now <= EXPIRING_SOON_MS && expiresAt - now > 0) {
    return { label: t('discover.expiringSoon'), locked: false, tone: 'soon' };
  }
  return { label: t('discover.openNow'), locked: false, tone: 'open' };
};

/** Best-effort creator handle for a cap (demo shows "@username"). */
export const capHandle = (cap: any): string =>
  '@' + (cap?.profiles?.username || cap?.profiles?.display_name || 'someone');

/** Card geometry — exported so the loading skeleton can match its footprint. */
export const CARD_W = 168;
export const CARD_H = 256;

/** "For You" carousel card (demo TallDiscoverCard): cover/gradient, type-tinted +
 *  timing badges, always-visible save, bottom scrim, serif 2-line title + handle. */
const TallDiscoverCard: React.FC<Props> = ({ cap, saved, onToggleSave, onPress }) => {
  const t = useT();
  const ct = getCapType(cap.type);
  const cover = cap.cover_photo_url || getMediaUrl(cap);
  const timing = computeCapTimingBadge(cap, t);
  const timingColor = TIMING_TONE_COLORS[timing.tone];

  // Keep the save tap from also opening the card.
  const handleSave = (e: GestureResponderEvent) => { e.stopPropagation?.(); onToggleSave(cap); };

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: ct.color + '40' }]}
      activeOpacity={0.9}
      onPress={() => onPress(cap)}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
      ) : (
        <LinearGradient colors={ct.gradient as [string, string]} style={StyleSheet.absoluteFill as any}>
          <View style={styles.iconCenter}><CapTypeIcon size={48} color={COLORS.white} /></View>
        </LinearGradient>
      )}
      {/* top scrim keeps the badges legible over bright covers */}
      <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={styles.topScrim} pointerEvents="none" />
      {/* bottom scrim makes the title legible over any cover */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.92)']} style={styles.scrim} pointerEvents="none" />

      {/* top-left stacked badges: type-tinted + timing */}
      <View style={styles.topLeft}>
        <BlurView tint="dark" intensity={18} style={[styles.typeBadge, { backgroundColor: ct.color + 'E0' }]}>
          <Text style={styles.typeBadgeText}>{ct.name}</Text>
        </BlurView>
        <BlurView tint="dark" intensity={18} style={[styles.timingBadge, { borderColor: timingColor + '66' }]}>
          {timing.locked && <Ionicons name="lock-closed" size={9} color={timingColor} />}
          <Text style={[styles.timingText, { color: timingColor }]} numberOfLines={1}>{timing.label}</Text>
        </BlurView>
      </View>

      {/* always-visible save (top-right) */}
      <TouchableOpacity
        onPress={handleSave}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.saveBtn, saved && { backgroundColor: ct.color + 'E0' }]}
        accessibilityRole="button"
      >
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={14} color={COLORS.white} />
      </TouchableOpacity>

      {/* bottom title + creator handle */}
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>{cap.title || ct.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{capHandle(cap)}</Text>
        {!!cap.location_name && <Text style={styles.subSmall} numberOfLines={1}>{cap.location_name}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_W, height: CARD_H, borderRadius: RADIUS.xl, overflow: 'hidden',
    backgroundColor: COLORS.bg3, marginRight: SPACING.md, borderWidth: 1,
  },
  iconCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: '32%' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  topLeft: { position: 'absolute', top: SPACING.sm, left: SPACING.sm, alignItems: 'flex-start', gap: 5, maxWidth: CARD_W - 44 },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' },
  typeBadgeText: { ...font('micro'), color: COLORS.white, textTransform: 'uppercase' },
  timingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  timingText: { ...font('micro'), textTransform: 'uppercase' },
  saveBtn: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottom: { position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: SPACING.md },
  title: { ...font('subtitle'), color: COLORS.white, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  sub: { ...font('micro'), color: 'rgba(255,255,255,0.85)', marginTop: 5 },
  subSmall: { ...font('micro'), color: 'rgba(255,255,255,0.55)', marginTop: 2 },
});

export default TallDiscoverCard;
