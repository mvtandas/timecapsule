import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert, RefreshControl, Modal, Animated, Dimensions, PanResponder, Platform, Image, Share, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CapsuleService } from '../../services/capsuleService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { formatDate } from '../../utils/dateUtils';
import { isLocked } from '../../utils/mediaUtils';
import { COLORS, font } from '../../constants/theme';
import CapTypeBadge from '../../components/common/CapTypeBadge';
import { SkeletonList } from '../../components/common/Skeleton';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useT } from '../../i18n';

const { width, height } = Dimensions.get('window');

interface MyCapsulesScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout?: () => void;
  onGoBack?: () => void;
}

type FilterChip = 'All' | 'Locked' | 'Unlocked' | 'Public' | 'Private';

const FILTER_CHIPS: FilterChip[] = ['All', 'Locked', 'Unlocked', 'Public', 'Private'];

const MyCapsulesScreen = ({ onNavigate, onGoBack }: MyCapsulesScreenProps) => {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'created' | 'shared'>('created');
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');

  const filteredCapsules = useMemo(() => {
    let result = capsules;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.title && c.title.toLowerCase().includes(query)) ||
          (c.description && c.description.toLowerCase().includes(query))
      );
    }

    // Apply chip filter
    switch (activeFilter) {
      case 'Locked':
        result = result.filter((c) => isLocked(c.open_at));
        break;
      case 'Unlocked':
        result = result.filter((c) => !isLocked(c.open_at));
        break;
      case 'Public':
        result = result.filter((c) => c.is_public === true);
        break;
      case 'Private':
        result = result.filter((c) => c.is_public === false);
        break;
      default:
        break;
    }

    return result;
  }, [capsules, searchQuery, activeFilter]);

  // Detail modal state
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const DETAIL_MODAL_HEIGHT = height * 0.9;
  const detailModalTranslateY = useRef(new Animated.Value(DETAIL_MODAL_HEIGHT)).current;
  const detailModalBackdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCapsules();
  }, [activeTab]);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'created') {
        const { data, error } = await CapsuleService.getUserCapsules();
        if (error) {
          if (__DEV__) console.error('Error loading capsules:', error);
          Alert.alert(t('myCaps.errorTitle'), t('myCaps.loadFailed'));
        } else {
          setCapsules(data || []);
        }
      } else {
        const { data, error } = await CapsuleService.getSharedCapsules();
        if (error) {
          if (__DEV__) console.error('Error loading shared capsules:', error);
        } else {
          setCapsules(data || []);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCapsules();
  };

  const getChipLabel = (chip: FilterChip): string => {
    switch (chip) {
      case 'All':
        return t('myCaps.chipAll');
      case 'Locked':
        return t('myCaps.chipLocked');
      case 'Unlocked':
        return t('myCaps.chipUnlocked');
      case 'Public':
        return t('myCaps.chipPublic');
      case 'Private':
        return t('myCaps.chipPrivate');
      default:
        return chip;
    }
  };

  // Deterministic icon/color per cap id — stable across renders (no flicker
  // when the list virtualizes & recycles rows).
  const hashId = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
  };
  const iconFor = (id: string) => {
    const icons = ['🏖️', '👨‍👩‍👧‍👦', '🎓', '🎉', '🎂', '🌴', '🎸', '📸', '✈️', '🎨'];
    return icons[hashId(id || '') % icons.length];
  };
  const colorFor = (id: string) => {
    const colors = ['#FFD166', '#06D6A0', '#FF6B6B', '#4ECDC4', '#95E1D3'];
    return colors[hashId(id || '') % colors.length];
  };

  const handleCapsuleTap = (capsule: any) => {
    setSelectedCapsule(capsule);
    setShowDetailModal(true);
  };

  const openDetailModal = () => {
    setShowDetailModal(true);
    Animated.parallel([
      Animated.timing(detailModalBackdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(detailModalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  };

  const closeDetailModal = () => {
    Animated.parallel([
      Animated.timing(detailModalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(detailModalTranslateY, {
        toValue: DETAIL_MODAL_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDetailModal(false);
      setSelectedCapsule(null);
    });
  };

  const getTimeComponents = (dateString: string | null) => {
    if (!dateString) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const openDate = new Date(dateString);
    const now = new Date();
    const diff = openDate.getTime() - now.getTime();
    
    if (diff < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  };

  // PanResponder for drag-to-dismiss on detail modal
  // Only triggers from the drag handle, not the scrollable content
  const detailModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture downward drags that start near the top
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          detailModalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeDetailModal();
        } else {
          Animated.spring(detailModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleDeleteCapsule = (capsuleId: string, title: string, event: any) => {
    // Stop propagation to prevent triggering the capsule tap
    event?.stopPropagation?.();
    
    Alert.alert(
      t('myCaps.deleteTitle'),
      t('myCaps.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await CapsuleService.deleteCapsule(capsuleId);
            if (error) {
              Alert.alert(t('myCaps.errorTitle'), t('myCaps.deleteFailed'));
            } else {
              Alert.alert(t('myCaps.successTitle'), t('myCaps.deleteSuccess'));
              loadCapsules(); // Reload the list
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('myCaps.headerTitle')}
        onBack={onGoBack}
        borderBottom
        right={(
          <TouchableOpacity onPress={() => onNavigate('Create')} style={styles.addButton} accessibilityRole="button" accessibilityLabel={t('a11y.createCap')}>
            <Ionicons name="add-circle" size={32} color={COLORS.ember} />
          </TouchableOpacity>
        )}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('created')}
            style={[styles.tab, activeTab === 'created' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
              {t('myCaps.tabCreated')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('shared')}
            style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
              {t('myCaps.tabShared')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.text3} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('myCaps.searchPlaceholder')}
            placeholderTextColor={COLORS.text3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsContainer}
        contentContainerStyle={styles.filterChipsContent}
      >
        {FILTER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.filterChip, activeFilter === chip && styles.filterChipActive]}
            onPress={() => setActiveFilter(chip)}
          >
            <Text style={[styles.filterChipText, activeFilter === chip && styles.filterChipTextActive]}>
              {getChipLabel(chip)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Capsules List */}
      {loading ? (
        <SkeletonList count={6} avatar="square" />
      ) : (
        <FlatList
          data={filteredCapsules}
          keyExtractor={(item) => item.id}
          style={styles.content}
          contentContainerStyle={filteredCapsules.length === 0 ? styles.emptyListContent : styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.ember]} tintColor={COLORS.ember} />
          }
          showsVerticalScrollIndicator={true}
          windowSize={9}
          initialNumToRender={8}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={80} color={COLORS.text3} />
              <Text style={styles.emptyTitle}>
                {capsules.length === 0
                  ? activeTab === 'created' ? t('myCaps.emptyCreatedTitle') : t('myCaps.emptySharedTitle')
                  : t('myCaps.emptyNoMatchTitle')}
              </Text>
              <Text style={styles.emptyText}>
                {capsules.length === 0
                  ? activeTab === 'created'
                    ? t('myCaps.emptyCreatedText')
                    : t('myCaps.emptySharedText')
                  : t('myCaps.emptyNoMatchText')}
              </Text>
              {capsules.length === 0 && activeTab === 'created' && (
                <TouchableOpacity
                  style={styles.emptyCtaButton}
                  onPress={() => onNavigate('Create')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyCtaButtonText}>{t('myCaps.createFirstCta')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: capsule }) => (
            <TouchableOpacity
              style={styles.capsuleCard}
              onPress={() => handleCapsuleTap(capsule)}
              activeOpacity={0.7}
            >
              <View style={styles.capsuleContent}>
                <View style={[styles.iconWrapper, { backgroundColor: colorFor(capsule.id) }]}>
                  <Text style={styles.iconText}>{iconFor(capsule.id)}</Text>
                </View>
                <View style={styles.capsuleInfo}>
                  <Text style={styles.capsuleTitle}>{capsule.title}</Text>
                  <View style={styles.capsuleBadgeRow}>
                    <CapTypeBadge type={capsule.type} />
                  </View>
                  <Text style={styles.capsuleTime}>{formatDate(capsule.open_at)}</Text>
                  {capsule.description && (
                    <Text style={styles.capsuleDescription} numberOfLines={1}>
                      {capsule.description}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.capsuleActions}>
                <Ionicons
                  name={isLocked(capsule.open_at) ? 'lock-closed' : 'lock-open'}
                  size={24}
                  color={isLocked(capsule.open_at) ? COLORS.danger : COLORS.moss}
                  style={styles.lockIcon}
                />
                {activeTab === 'created' && capsule.type === 'trail' && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onNavigate('TrailStops', { capsuleId: capsule.id, trailTitle: capsule.title });
                    }}
                    style={styles.deleteButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('trailEditor.editStops')}
                  >
                    <Ionicons name="trail-sign" size={20} color={COLORS.gold} />
                  </TouchableOpacity>
                )}
                {activeTab === 'created' && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCapsule(capsule.id, capsule.title, e);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <CapsuleDetailModal
        visible={showDetailModal}
        capsule={selectedCapsule}
        capsules={capsules}
        onClose={() => setShowDetailModal(false)}
      />

      {/* OLD MODAL - disabled */}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  addButton: {
    padding: 4,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.ember,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text2,
  },
  activeTabText: {
    fontWeight: '700',
    color: COLORS.ember,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: COLORS.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    height: 44,
  },
  filterChipsContainer: {
    maxHeight: 48,
    backgroundColor: COLORS.bg,
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.ember,
    borderColor: COLORS.ember,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text2,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  capsuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  capsuleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  capsuleInfo: {
    flex: 1,
  },
  capsuleTitle: {
    ...font('subtitle'),
    color: COLORS.text,
    marginBottom: 4,
  },
  capsuleBadgeRow: {
    marginBottom: 6,
  },
  capsuleTime: {
    fontSize: 14,
    color: COLORS.text2,
  },
  capsuleDescription: {
    fontSize: 12,
    color: COLORS.text3,
    marginTop: 2,
  },
  capsuleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    marginRight: 0,
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...font('title'),
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaButton: {
    backgroundColor: COLORS.ember,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyCtaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Detail Modal Styles
});

export default MyCapsulesScreen;
