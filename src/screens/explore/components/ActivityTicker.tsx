import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType, capColor } from '../../../constants/capTypes';
import { timeAgo } from '../../../utils/dateUtils';
import { useT } from '../../../i18n';

interface Props {
  items: any[]; // recent caps
  onOpen: (cap: any) => void;
}

/** Soft pulsing dot — the demo's "live" indicator. */
const PulseDot: React.FC = () => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseHalo, { transform: [{ scale }], opacity }]} />
      <View style={styles.pulseDot} />
    </View>
  );
};

/** "Live around you" — a designed panel of tappable recent-activity pills with a
 *  pulsing live dot header, gradient surface, border, and soft edge-fade scrims. */
const ActivityTicker: React.FC<Props> = ({ items, onOpen }) => {
  const t = useT();

  // Continuous auto-scroll (mirrors the demo's `tickerScroll` loop). We render the
  // pill row twice and translate the track left by exactly one copy's repeat width
  // (the copy's own width plus the gap that follows it), so the duplicate slides into
  // view seamlessly before the value loops back to 0. Duration scales with item count
  // so a longer feed keeps the same readable per-pill pace.
  const translateX = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [copyWidth, setCopyWidth] = useState(0);
  // Paused while the user is touching/dragging the row; resumes on release.
  const pausedRef = useRef(false);

  const pills = (items || []).slice(0, 12);
  const GAP = SPACING.sm;
  // The distance from one copy's start to the next copy's start.
  const repeat = copyWidth + GAP;

  const startLoop = useCallback(() => {
    loopRef.current?.stop();
    if (!repeat || pausedRef.current) return;
    // ~2.4s per item, linear — slow enough to read, fast enough to feel alive.
    const duration = Math.max(pills.length, 1) * 2400;
    translateX.setValue(0);
    loopRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -repeat,
        duration,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    loopRef.current.start();
  }, [repeat, pills.length, translateX]);

  useEffect(() => {
    startLoop();
    return () => loopRef.current?.stop();
  }, [startLoop]);

  const onPause = useCallback(() => {
    pausedRef.current = true;
    loopRef.current?.stop();
  }, []);
  const onResume = useCallback(() => {
    pausedRef.current = false;
    startLoop();
  }, [startLoop]);

  // Measure one copy so the loop distance is exact regardless of content width.
  const onCopyLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.abs(w - copyWidth) > 1) setCopyWidth(w);
  }, [copyWidth]);

  if (!items?.length) return null;

  // Per-type descriptive copy (mirrors the demo's buildActivityText); falls back
  // to the generic line when a location/title isn't available.
  const labelFor = (c: any, ct: { name: string }, user: string) => {
    const title = c.title || ct.name;
    const loc = c.location_name;
    switch (c.type) {
      case 'scroll': return t('discover.ticker_scroll', { user, title });
      case 'gathering': return t('discover.ticker_gathering', { user, title });
      case 'trail': return loc ? t('discover.ticker_trail', { user, loc }) : t('discover.tickerActivity', { user, type: ct.name });
      case 'whisper': return loc ? t('discover.ticker_whisper', { loc }) : t('discover.tickerActivity', { user, type: ct.name });
      default: return loc ? t('discover.ticker_public', { user, loc }) : t('discover.tickerActivity', { user, type: ct.name });
    }
  };

  return (
    <View style={styles.outer}>
      <LinearGradient colors={[COLORS.bg2, COLORS.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
        <View style={styles.labelRow}>
          <PulseDot />
          <Text style={styles.label}>{t('discover.live')}</Text>
        </View>
        <View style={styles.scrollWrap}>
          {/* The auto-scrolling track. Touch handlers pause the loop while the user
              interacts, then resume it on release — taps still reach the pills. */}
          <Animated.View
            style={[styles.track, { transform: [{ translateX }] }]}
            onTouchStart={onPause}
            onTouchEnd={onResume}
            onTouchCancel={onResume}
          >
            {[0, 1].map((copy) => (
              <View
                key={copy}
                style={styles.copy}
                onLayout={copy === 0 ? onCopyLayout : undefined}
                // The duplicate copy is purely decorative for the seamless loop.
                accessibilityElementsHidden={copy === 1}
                importantForAccessibility={copy === 1 ? 'no-hide-descendants' : 'auto'}
              >
                {pills.map((c) => {
                  const ct = getCapType(c.type);
                  const user = '@' + (c.profiles?.username || c.profiles?.display_name || t('capDetail.someone'));
                  return (
                    <TouchableOpacity key={c.id} style={styles.pill} activeOpacity={0.8} onPress={() => onOpen(c)}>
                      <View style={[styles.dot, { backgroundColor: capColor(c.type) }]} />
                      <Text style={styles.pillText} numberOfLines={1}>
                        {labelFor(c, ct, user)}
                        <Text style={styles.pillMuted}>{`  ·  ${timeAgo(c.created_at)}`}</Text>
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Animated.View>
          {/* soft edge-fade scrims on the horizontal scroll */}
          <LinearGradient
            colors={[COLORS.card, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.fade, styles.fadeLeft]} pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', COLORS.card]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.fade, styles.fadeRight]} pointerEvents="none"
          />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { marginTop: SPACING.sm, paddingHorizontal: SPACING.lg },
  panel: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', paddingBottom: SPACING.sm },
  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  pulseWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  pulseHalo: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.moss },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.moss },
  label: { ...font('eyebrow'), color: COLORS.text2 },
  scrollWrap: { position: 'relative', paddingTop: SPACING.sm, overflow: 'hidden' },
  // The track holds two identical copies; the gap between them must equal the gap
  // between pills so the loop wrap is seamless. alignSelf:'flex-start' lets it size
  // to content (wider than the panel) instead of clamping to the panel width.
  track: { flexDirection: 'row', alignSelf: 'flex-start', gap: SPACING.sm, paddingLeft: SPACING.md },
  // One copy = a non-wrapping row of pills with the same inter-pill gap.
  copy: { flexDirection: 'row', gap: SPACING.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 260,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { ...font('caption'), color: COLORS.text },
  pillMuted: { color: COLORS.text3 },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 24 },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
});

export default ActivityTicker;
