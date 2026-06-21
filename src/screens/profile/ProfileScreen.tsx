import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet,
  Dimensions, RefreshControl, Share, Alert, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '../../store/authStore';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../services/mediaService';
import { SavedService } from '../../services/savedService';
import { MemoriesService, type Memory } from '../../services/memoriesService';
import { AchievementService, type AchievementSummary } from '../../services/achievementService';
import { TrailService } from '../../services/trailService';
import { FriendService } from '../../services/friendService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { COLORS, SPACING, font } from '../../constants/theme';
import { useT } from '../../i18n';

import ProfileHero, { type StatItem } from './components/ProfileHero';
import ProfileActions from './components/ProfileActions';
import AchievementStrip from './components/AchievementStrip';
import ProfileTabs, { type TabDef } from './components/ProfileTabs';
import CapGridCard from './components/CapGridCard';
import MemoryCard from './components/MemoryCard';
import ProfileEmptyState from './components/ProfileEmptyState';
import PhotoPickerSheet from './components/PhotoPickerSheet';

const { width } = Dimensions.get('window');
const PAD = SPACING.lg;
const GAP = SPACING.md;
const CARD_WIDTH = (width - PAD * 2 - GAP) / 2;

type TabKey = 'caps' | 'saved' | 'memories';

interface ProfileScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
}

const ProfileScreen = ({ onNavigate }: ProfileScreenProps) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Core data
  const [caps, setCaps] = useState<any[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(true);
  const [capsulesCount, setCapsulesCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [trailsCount, setTrailsCount] = useState(0);
  const [summary, setSummary] = useState<AchievementSummary | null>(null);

  // Lazy tab data (null = not loaded yet)
  const [savedItems, setSavedItems] = useState<any[] | null>(null);
  const [memories, setMemories] = useState<Memory[] | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('caps');
  const [refreshing, setRefreshing] = useState(false);

  // Avatar
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.avatar_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);

  // Sticky-tabs machinery
  const [headerH, setHeaderH] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const tabY = useRef(0);

  useEffect(() => { loadCore(); }, []);
  useEffect(() => { if (user?.avatar_url) setProfilePhoto(user.avatar_url); }, [user?.avatar_url]);

  // Lazy-load a tab's data the first time it becomes active (works regardless
  // of how the tab is activated — tap, default, or programmatic).
  useEffect(() => {
    if (activeTab === 'saved' && savedItems === null) loadSaved();
    if (activeTab === 'memories' && memories === null) loadMemories();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCore = async () => {
    try {
      setLoadingCaps(true);
      const [capsRes, friends, ach, trails] = await Promise.all([
        CapsuleService.getUserCapsules(),
        FriendService.getFriends(),
        AchievementService.compute(),
        TrailService.getCompletedCount(),
      ]);
      const list = capsRes?.data || [];
      setCaps(list);
      setCapsulesCount(list.length);
      setFriendsCount(friends?.data?.length || 0);
      setTrailsCount(trails || 0);
      setSummary(ach);
    } catch (e) {
      if (__DEV__) console.warn('profile loadCore:', e);
    } finally {
      setLoadingCaps(false);
    }
  };

  const loadSaved = async () => setSavedItems(await SavedService.list());
  const loadMemories = async () => {
    const [a, b] = await Promise.all([MemoriesService.getOnThisDay(), MemoriesService.getRecentMemories()]);
    const map = new Map<string, Memory>();
    [...a, ...b].forEach((m) => { if (m.capsule?.id && !map.has(m.capsule.id)) map.set(m.capsule.id, m); });
    setMemories(Array.from(map.values()));
  };

  const onChangeTab = useCallback((key: string) => setActiveTab(key as TabKey), []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCore();
    if (savedItems !== null) await loadSaved();
    if (memories !== null) await loadMemories();
    setRefreshing(false);
  };

  // ── Avatar upload ───────────────────────────────────────────
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('profile.permissionRequired'), t('profile.cameraPermission')); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setPhotoPickerVisible(false); await uploadAvatar(r.assets[0].uri); }
  };
  const handleChooseGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('profile.permissionRequired'), t('profile.galleryPermission')); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setPhotoPickerVisible(false); await uploadAvatar(r.assets[0].uri); }
  };
  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    try {
      setUploadingPhoto(true);
      setProfilePhoto(uri); // optimistic
      const { url, error } = await MediaService.uploadAvatar(uri, user.id);
      if (error || !url) throw new Error('upload failed');
      const { error: upErr } = await useAuthStore.getState().updateProfile({ avatar_url: url });
      if (upErr) throw new Error('update failed');
      setProfilePhoto(url);
    } catch {
      setProfilePhoto(user?.avatar_url || null);
      Alert.alert(t('profile.error'), t('profile.updatePhotoFailed'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const invite = useCallback(async () => {
    try { await Share.share({ message: t('profile.inviteShareMessage') }); } catch { /* dismissed */ }
  }, [t]);

  const openCap = useCallback((cap: any) => setSelectedCapsule(cap), []);

  // ── Derived view state ──────────────────────────────────────
  const isMemories = activeTab === 'memories';
  const data: any[] = activeTab === 'caps' ? caps : activeTab === 'saved' ? (savedItems || []) : (memories || []);
  const numColumns = isMemories ? 1 : 2;
  const tabLoading = activeTab === 'caps' ? loadingCaps : activeTab === 'saved' ? savedItems === null : memories === null;
  const detailList = isMemories ? (memories || []).map((m) => m.capsule) : data;

  const stats: StatItem[] = [
    { key: 'caps', label: t('profile.statCaps'), value: capsulesCount, onPress: () => onNavigate('MyCapsules') },
    { key: 'friends', label: t('profile.statFriends'), value: friendsCount, onPress: () => onNavigate('Friends') },
    { key: 'trails', label: t('profile.statTrails'), value: trailsCount },
  ];
  const tabs: TabDef[] = [
    { key: 'caps', label: t('profile.myCaps') },
    { key: 'saved', label: t('profile.tabSaved') },
    { key: 'memories', label: t('profile.tabMemories') },
  ];

  const joinedLabel = user?.created_at
    ? t('profile.joined', { date: new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) })
    : null;

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (isMemories) return <View style={styles.memoryItem}><MemoryCard memory={item} onPress={openCap} /></View>;
    return <CapGridCard capsule={item} width={CARD_WIDTH} onPress={openCap} />;
  }, [isMemories, openCap]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowSticky(tabY.current > 0 && y >= tabY.current - 0.5);
  };

  const ListEmpty = () => {
    if (tabLoading) {
      return <View style={styles.tabLoading}><ActivityIndicator size="large" color={COLORS.ember} /></View>;
    }
    if (activeTab === 'saved') {
      return <ProfileEmptyState icon="bookmark-outline" title={t('saved.empty_title')} text={t('saved.empty_subtitle')} />;
    }
    if (activeTab === 'memories') {
      return <ProfileEmptyState icon="sparkles-outline" title={t('memories.empty_title')} text={t('memories.empty_text')} ctaLabel={t('memories.empty_cta')} onCta={() => onNavigate('Create')} />;
    }
    return <ProfileEmptyState icon="time-outline" title={t('profile.emptyTitle')} text={t('profile.emptyText')} ctaLabel={t('profile.createCap')} onCta={() => onNavigate('Create')} />;
  };

  const ListHeader = (
    <View>
      <ProfileHero
        displayName={user?.display_name || t('profile.defaultName')}
        username={user?.username || t('profile.defaultUsername')}
        joinedLabel={joinedLabel}
        location={user?.location}
        bio={user?.bio}
        photo={profilePhoto}
        uploading={uploadingPhoto}
        onAvatarPress={() => setPhotoPickerVisible(true)}
        stats={stats}
      />
      <ProfileActions onEdit={() => onNavigate('AccountSettings')} onInvite={invite} />
      <AchievementStrip summary={summary} onPress={() => onNavigate('Achievements')} />
      <View
        style={styles.tabsHolder}
        onLayout={(e) => { tabY.current = e.nativeEvent.layout.y; }}
      >
        <ProfileTabs tabs={tabs} active={activeTab} onChange={onChangeTab} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Fixed slim header */}
      <View
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <Text style={styles.handle} numberOfLines={1}>@{user?.username || t('profile.defaultUsername')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => onNavigate('AccountSettings')} activeOpacity={0.7} style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        key={`cols-${numColumns}`}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, i) => item?.id || String(i)}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.column : undefined}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        windowSize={7}
        initialNumToRender={6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ember} />}
      />

      {/* Sticky tab bar overlay (appears once the in-flow tabs scroll under the header) */}
      {showSticky && (
        <View style={[styles.sticky, { top: headerH }]}>
          <ProfileTabs tabs={tabs} active={activeTab} onChange={onChangeTab} />
        </View>
      )}

      <PhotoPickerSheet
        visible={photoPickerVisible}
        onClose={() => setPhotoPickerVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseGallery={handleChooseGallery}
      />

      <CapsuleDetailModal
        visible={!!selectedCapsule}
        capsule={selectedCapsule}
        capsules={detailList}
        onClose={() => setSelectedCapsule(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, backgroundColor: COLORS.bg,
    zIndex: 20,
  },
  handle: { ...font('title'), color: COLORS.text, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  listContent: { paddingBottom: 124 }, // clear the floating glass tab bar
  column: { paddingHorizontal: PAD, gap: GAP },
  memoryItem: { paddingHorizontal: PAD, marginBottom: SPACING.sm },
  tabsHolder: { marginTop: SPACING.md },

  sticky: {
    position: 'absolute', left: 0, right: 0, zIndex: 15, backgroundColor: COLORS.bg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },

  tabLoading: { paddingVertical: 60, alignItems: 'center' },
});

export default ProfileScreen;
