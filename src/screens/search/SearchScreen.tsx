import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ScrollView, ActivityIndicator, Image, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchService, type PlaceResult } from '../../services/searchService';

const RECENT_KEY = 'voorcap.recentSearches';
const TRENDING = ['Coffee', 'Sunset', 'Street art', 'Hidden gems', 'Food', 'Nature'];
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import CapTypeBadge from '../../components/common/CapTypeBadge';
import { COLORS, font } from '../../constants/theme';
import { capColor } from '../../constants/capTypes';
import { useT } from '../../i18n';

interface SearchScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

type Tab = 'all' | 'caps' | 'people' | 'places';

const SearchScreen = ({ onNavigate, onGoBack }: SearchScreenProps) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(false);
  const [caps, setCaps] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => { try { const raw = await AsyncStorage.getItem(RECENT_KEY); if (raw) setRecent(JSON.parse(raw)); } catch { /* ignore */ } })();
  }, []);

  const saveRecent = async (q: string) => {
    const v = q.trim(); if (!v) return;
    const next = [v, ...recent.filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 8);
    setRecent(next);
    try { await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const clearRecent = async () => { setRecent([]); try { await AsyncStorage.removeItem(RECENT_KEY); } catch { /* ignore */ } };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setCaps([]);
      setPeople([]);
      setPlaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      const [c, p, pl] = await Promise.all([
        SearchService.searchCaps(query),
        SearchService.searchPeople(query),
        SearchService.searchPlaces(query),
      ]);
      setCaps(c);
      setPeople(p);
      setPlaces(pl);
      setLoading(false);
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const showCaps = tab === 'all' || tab === 'caps';
  const showPeople = tab === 'all' || tab === 'people';
  const showPlaces = tab === 'all' || tab === 'places';

  type Row =
    | { kind: 'header'; label: string }
    | { kind: 'cap'; data: any }
    | { kind: 'person'; data: any }
    | { kind: 'place'; data: PlaceResult };
  const rows: Row[] = [];
  if (showPeople && people.length) {
    rows.push({ kind: 'header', label: t('search.header_people') });
    people.forEach((p) => rows.push({ kind: 'person', data: p }));
  }
  if (showPlaces && places.length) {
    rows.push({ kind: 'header', label: t('search.header_places') });
    places.forEach((p) => rows.push({ kind: 'place', data: p }));
  }
  if (showCaps && caps.length) {
    rows.push({ kind: 'header', label: t('search.header_caps') });
    caps.forEach((c) => rows.push({ kind: 'cap', data: c }));
  }

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'header') {
      return <Text style={[font('eyebrow'), styles.sectionHeader]}>{item.label}</Text>;
    }
    if (item.kind === 'person') {
      const p = item.data;
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={() => {
            Keyboard.dismiss();
            onNavigate('FriendProfile', { friend: p });
          }}
        >
          <View style={styles.avatar}>
            {p.avatar_url ? (
              <Image source={{ uri: p.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={18} color={COLORS.text3} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[font('bodyBold'), { color: COLORS.text }]} numberOfLines={1}>
              {p.display_name || p.username || t('search.voorcap_user')}
            </Text>
            {!!p.username && (
              <Text style={[font('caption'), { color: COLORS.text3 }]}>@{p.username}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
        </TouchableOpacity>
      );
    }
    if (item.kind === 'place') {
      const pl = item.data;
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={() => {
            Keyboard.dismiss();
            setTab('caps');
            setQuery(pl.name);
          }}
        >
          <View style={styles.placeIcon}>
            <Ionicons name="location" size={18} color={COLORS.ember} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[font('bodyBold'), { color: COLORS.text }]} numberOfLines={1}>
              {pl.name}
            </Text>
            <Text style={[font('caption'), { color: COLORS.text3 }]}>
              {t('search.place_caps', { n: pl.count })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
        </TouchableOpacity>
      );
    }
    const c = item.data;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => {
          Keyboard.dismiss();
          setSelected(c);
          setShowDetail(true);
        }}
      >
        <View style={[styles.dot, { backgroundColor: capColor(c.type) }]} />
        <View style={{ flex: 1 }}>
          <Text style={[font('bodyBold'), { color: COLORS.text }]} numberOfLines={1}>
            {c.title || t('search.untitled_cap')}
          </Text>
          {!!c.location_name && (
            <Text style={[font('caption'), { color: COLORS.text3 }]} numberOfLines={1}>
              {c.location_name}
            </Text>
          )}
        </View>
        <CapTypeBadge type={c.type} />
      </TouchableOpacity>
    );
  };

  const hasQuery = query.trim().length > 0;
  const empty = hasQuery && !loading && rows.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onGoBack && onGoBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.text3} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={COLORS.text3}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => saveRecent(query)}
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.text3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        {(['all', 'caps', 'people', 'places'] as Tab[]).map((tabKey) => (
          <TouchableOpacity key={tabKey} onPress={() => setTab(tabKey)} style={[styles.tab, tab === tabKey && styles.tabActive]}>
            <Text style={[font('label'), { color: tab === tabKey ? COLORS.ember : COLORS.text3 }]}>
              {tabKey === 'all'
                ? t('search.tab_all')
                : tabKey === 'caps'
                ? t('search.tab_caps')
                : tabKey === 'people'
                ? t('search.tab_people')
                : t('search.tab_places')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.ember} /></View>
      ) : empty ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={44} color={COLORS.text3} />
          <Text style={[font('subtitle'), { color: COLORS.text2, marginTop: 10 }]}>{t('search.no_results')}</Text>
        </View>
      ) : !hasQuery ? (
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {recent.length > 0 && (
            <>
              <View style={styles.recentHead}>
                <Text style={[font('eyebrow'), { color: COLORS.text3 }]}>{t('search.recent')}</Text>
                <TouchableOpacity onPress={clearRecent}><Text style={[font('caption'), { color: COLORS.ember }]}>{t('search.clear')}</Text></TouchableOpacity>
              </View>
              {recent.map((r) => (
                <TouchableOpacity key={r} style={styles.recentRow} onPress={() => setQuery(r)} activeOpacity={0.7}>
                  <Ionicons name="time-outline" size={16} color={COLORS.text3} />
                  <Text style={[font('body'), { color: COLORS.text, flex: 1 }]} numberOfLines={1}>{r}</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.text3} />
                </TouchableOpacity>
              ))}
            </>
          )}
          <Text style={[font('eyebrow'), { color: COLORS.text3, marginTop: recent.length ? 20 : 0, marginBottom: 10 }]}>{t('search.trending')}</Text>
          <View style={styles.trendWrap}>
            {TRENDING.map((term) => (
              <TouchableOpacity key={term} style={styles.trendChip} onPress={() => setQuery(term)} activeOpacity={0.8}>
                <Ionicons name="trending-up" size={13} color={COLORS.ember} />
                <Text style={[font('label'), { color: COLORS.text }]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => (item.kind === 'header' ? `h-${item.label}` : item.kind === 'place' ? `place-${item.data.name}-${i}` : `${item.kind}-${item.data.id}-${i}`)}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <CapsuleDetailModal visible={showDetail} capsule={selected} onClose={() => setShowDetail(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg3,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  input: { flex: 1, color: COLORS.text, ...font('body') },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.bg3 },
  tabActive: { backgroundColor: COLORS.emberSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  trendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { color: COLORS.text3, marginTop: 8, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bg3,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  placeIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.emberSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 38, height: 38 },
});

export default SearchScreen;
