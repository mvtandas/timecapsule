import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { CapsuleService } from '../../services/capsuleService';
import { SavedService } from '../../services/savedService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import MessagesButton from '../../components/common/MessagesButton';
import { calculateDistance } from '../../utils/geoUtils';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { Skeleton } from '../../components/common/Skeleton';
import { VoorcapWordmark } from '../../components/common/VoorcapLogo';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';
import ActivityTicker from './components/ActivityTicker';
import TallDiscoverCard, { CARD_W, CARD_H } from './components/TallDiscoverCard';
import TrendingRow from './components/TrendingRow';
import DiscoverFilters, { DiscoverFilterId } from './components/DiscoverFilters';

interface ExploreScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

/** Per-filter empty/feedback block — keeps a tap that returns little feeling responsive. */
const EmptyState: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  action?: { label: string; onPress: () => void };
  busy?: boolean;
}> = ({ icon, text, action, busy }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={22} color={COLORS.text3} />
    <Text style={styles.emptyText}>{text}</Text>
    {action && (
      <TouchableOpacity style={styles.emptyBtn} onPress={action.onPress} activeOpacity={0.85} disabled={busy}>
        <Ionicons name="location" size={14} color={COLORS.ember} />
        <Text style={styles.emptyBtnText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/** Section-shaped loading state: a "Live" panel shell, 3 tall card shells, 3 row shells. */
const DiscoverSkeleton: React.FC = () => (
  <View>
    <View style={styles.skelPanel}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skelTickerRow}>
          <Skeleton width={26} height={26} radius={9} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="70%" height={9} />
            <Skeleton width="40%" height={7} />
          </View>
        </View>
      ))}
    </View>
    <View style={styles.sectionHeader}><Skeleton width={90} height={11} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} scrollEnabled={false}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginRight: SPACING.md }}>
          <Skeleton width={CARD_W} height={CARD_H} radius={RADIUS.xl} />
        </View>
      ))}
    </ScrollView>
    <View style={styles.sectionHeader}><Skeleton width={110} height={11} /></View>
    <View style={styles.list}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skelTrendRow}>
          <Skeleton width={60} height={60} radius={RADIUS.md} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="70%" height={13} />
            <Skeleton width="45%" height={10} />
          </View>
        </View>
      ))}
    </View>
  </View>
);

/** Discover — a no-map discovery FEED (the map lives on Home). Mirrors the demo's
 *  Discover: header+search, "Live around you" ticker, "For You" carousel, filter
 *  chips (For You/Nearby/Unopened/Trending), and a "Trending now" list. */
const ExploreScreen = ({ onNavigate }: ExploreScreenProps) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [pool, setPool] = useState<any[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<DiscoverFilterId>('for_you');
  const [selected, setSelected] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // True while we're actively resolving a location fix for the "Nearby" filter.
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data } = await CapsuleService.getAllAccessibleCapsules();
      const caps = (data || []).slice();
      caps.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setPool(caps);
      const saved = await SavedService.list();
      setSavedIds(new Set(saved.map((c: any) => c.id)));
      // Caps the user has already opened — feeds the "Unopened" filter.
      const opened = await CapsuleService.getOpenedCapsuleIds();
      setOpenedIds(new Set(opened));
    } catch (e) {
      if (__DEV__) console.error('Discover load error:', e);
      setPool([]);
    }
  }, []);

  // Best-effort location (no blocking prompt) so the "Nearby" filter can sort.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch { /* ignore */ }
    })();
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Resolve a location fix on demand — requesting permission if we don't have one
  // yet — so tapping "Nearby" produces a visible result instead of a silent no-op.
  const ensureLocation = useCallback(async () => {
    if (coords || locating) return;
    setLocating(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        ({ status } = await Location.requestForegroundPermissionsAsync());
      }
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch { /* ignore */ }
    finally { setLocating(false); }
  }, [coords, locating]);

  // When the user switches to the Nearby filter, kick off a fix if we lack one.
  const onChangeFilter = useCallback((id: DiscoverFilterId) => {
    setFilter(id);
    if (id === 'nearby') ensureLocation();
  }, [ensureLocation]);

  const filtered = useMemo(() => {
    const caps = pool || [];
    if (filter === 'trending') return [...caps].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    if (filter === 'unopened') return caps.filter((c) => !openedIds.has(c.id));
    if (filter === 'nearby') {
      if (!coords) return caps;
      return caps
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({ ...c, _d: calculateDistance(coords.lat, coords.lng, c.lat, c.lng) }))
        .sort((a: any, b: any) => a._d - b._d);
    }
    return caps; // for_you = recency
  }, [pool, filter, userId, coords, openedIds]);

  const toggleSave = async (cap: any) => {
    setSavedIds((prev) => { const n = new Set(prev); n.has(cap.id) ? n.delete(cap.id) : n.add(cap.id); return n; });
    await SavedService.toggle(cap.id);
  };
  const openCap = (cap: any) => { setSelected(cap); setShowDetail(true); CapsuleService.incrementViewCount(cap.id); };

  const loading = pool === null;
  // "Öne çıkanlar" hero strip — a fixed highlights cut (most recent), independent
  // of the filter chips. The chips drive the single list below, not this strip.
  const featured = (pool || []).slice(0, 8);
  // The single feed reflects the active filter; its header label matches the chip.
  const sectionLabel = filter === 'nearby'
    ? t('discover.filter_nearby')
    : filter === 'unopened'
      ? t('discover.filter_unopened')
      : filter === 'trending'
        ? t('discover.filter_trending')
        : t('discover.for_you');

  // Per-filter empty copy so a tap that legitimately returns little still reads as
  // responsive feedback rather than a dead screen.
  const emptyCopy = (): string => {
    if (filter === 'nearby') {
      if (locating) return t('discover.locating', { defaultValue: 'Getting your location…' });
      if (!coords) return t('discover.enableLocation', { defaultValue: 'Enable location to see caps near you.' });
      return t('discover.emptyNearby', { defaultValue: 'No caps near you right now.' });
    }
    if (filter === 'unopened') return t('discover.emptyUnopened', { defaultValue: 'You’ve opened everything here.' });
    return t('discover.empty');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + SPACING.sm, paddingBottom: 124 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ember} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('discover.title')}</Text>
            <Text style={styles.subtitle}>
              {t('discover.subtitle')}
              {'\n'}
              {t('discover.subtitle2_pre', { defaultValue: 'Find what’s meant to be ' })}
              <Text style={styles.subtitleAccent}>{t('discover.subtitle2_accent', { defaultValue: 'felt' })}</Text>
              {t('discover.subtitle2_post', { defaultValue: '.' })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.searchBtn} onPress={() => onNavigate('Search')} accessibilityRole="button" accessibilityLabel={t('discover.title')}>
              <Ionicons name="search" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <MessagesButton onPress={() => onNavigate('Messages')} />
          </View>
        </View>

        {loading ? (
          <DiscoverSkeleton />
        ) : (
          <>
            <ActivityTicker items={pool || []} onOpen={openCap} />

            {/* Fixed highlights strip — independent of the filter chips. */}
            {featured.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>{t('discover.featured', { defaultValue: 'Öne çıkanlar' })}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                  {featured.map((c) => (
                    <TallDiscoverCard key={c.id} cap={c} saved={savedIds.has(c.id)} onToggleSave={toggleSave} onPress={openCap} />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Filter chips drive the single feed below. */}
            <DiscoverFilters active={filter} onChange={onChangeFilter} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{sectionLabel}</Text>
            </View>
            <View style={styles.list}>
              {filtered.map((c) => (
                <TrendingRow key={c.id} cap={c} saved={savedIds.has(c.id)} onToggleSave={toggleSave} onPress={openCap} />
              ))}
              {!filtered.length && (
                <EmptyState
                  icon={filter === 'nearby' ? 'location-outline' : 'sparkles-outline'}
                  text={emptyCopy()}
                  action={filter === 'nearby' && !coords && !locating
                    ? { label: t('discover.filter_nearby'), onPress: ensureLocation }
                    : undefined}
                  busy={filter === 'nearby' && locating}
                />
              )}
            </View>

            <View style={styles.footer}>
              <VoorcapWordmark size={18} />
              <Text style={styles.footerTag}>{t('discover.tagline', { defaultValue: 'Sealed moments, dropped in time' })}</Text>
            </View>
          </>
        )}
      </ScrollView>

      <CapsuleDetailModal visible={showDetail} capsule={selected} capsules={filtered} onClose={() => setShowDetail(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  title: { ...font('display'), color: COLORS.text, marginBottom: 4 },
  subtitle: { ...font('body'), color: COLORS.text2, marginTop: 2 },
  subtitleAccent: { color: COLORS.ember },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  sectionLabel: { ...font('eyebrow'), color: COLORS.text2 },
  sectionAction: { ...font('labelBold'), color: COLORS.ember },
  carousel: { paddingHorizontal: SPACING.lg, paddingRight: SPACING.sm },
  list: { paddingHorizontal: SPACING.lg },
  emptyState: { alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
  emptyText: { ...font('body'), color: COLORS.text3, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.emberSoft, borderWidth: 1, borderColor: COLORS.ember + '40',
  },
  emptyBtnText: { ...font('labelBold'), color: COLORS.ember },
  skelPanel: {
    marginTop: SPACING.sm, marginHorizontal: SPACING.lg, gap: SPACING.sm,
    backgroundColor: COLORS.bg2, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  skelTickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skelTrendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  footer: { alignItems: 'center', gap: 6, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  footerTag: { ...font('micro'), color: COLORS.text3, letterSpacing: 0.4 },
});

export default ExploreScreen;
