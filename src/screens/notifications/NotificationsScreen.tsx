import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationAppService, AppNotification } from '../../services/notificationService';
import { TrailService } from '../../services/trailService';
import { timeAgo } from '../../utils/dateUtils';
import { SkeletonList } from '../../components/common/Skeleton';
import ScreenHeader from '../../components/common/ScreenHeader';
import MessagesButton from '../../components/common/MessagesButton';
import CapTypeIcon from '../../components/common/CapTypeIcon';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { getCapType } from '../../constants/capTypes';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface NotificationsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

type NotifFilter = 'All' | 'Unread' | 'Likes' | 'Comments' | 'Friends';

const NOTIF_FILTERS: NotifFilter[] = ['All', 'Unread', 'Likes', 'Comments', 'Friends'];

type TimeGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';
const TIME_GROUPS: TimeGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Bucket a created_at timestamp into a Today/Yesterday/This Week/Earlier group. */
const timeGroupFor = (createdAt: string): TimeGroup => {
  const now = new Date();
  const today = startOfDay(now);
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return 'Earlier';
  if (ts >= today) return 'Today';
  if (ts >= today - 86400000) return 'Yesterday';
  if (ts >= today - 6 * 86400000) return 'This Week';
  return 'Earlier';
};

const NotificationsScreen = ({ onNavigate, onGoBack }: NotificationsScreenProps) => {
  const t = useT();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('All');
  const [activeTrails, setActiveTrails] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    if (activeFilter === 'Unread') return notifications.filter((n) => !n.is_read);
    if (activeFilter === 'Likes') return notifications.filter((n) => n.type === 'like');
    if (activeFilter === 'Comments') return notifications.filter((n) => n.type === 'comment');
    if (activeFilter === 'Friends')
      return notifications.filter(
        (n) => n.type === 'friend_request' || n.type === 'friend_accepted'
      );
    return notifications;
  }, [notifications, activeFilter]);

  // Flatten into a list of section headers + notification rows, bucketed by
  // created_at into Today / Yesterday / This Week / Earlier.
  type ListRow =
    | { kind: 'section'; group: TimeGroup }
    | { kind: 'notif'; notif: AppNotification };
  const listData = useMemo<ListRow[]>(() => {
    const buckets: Record<TimeGroup, AppNotification[]> = {
      Today: [], Yesterday: [], 'This Week': [], Earlier: [],
    };
    filteredNotifications.forEach((n) => { buckets[timeGroupFor(n.created_at)].push(n); });
    const rows: ListRow[] = [];
    TIME_GROUPS.forEach((g) => {
      if (buckets[g].length === 0) return;
      rows.push({ kind: 'section', group: g });
      buckets[g].forEach((notif) => rows.push({ kind: 'notif', notif }));
    });
    return rows;
  }, [filteredNotifications]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await NotificationAppService.getNotifications();
    setNotifications(data);
    TrailService.getActiveTrails().then(setActiveTrails).catch(() => {});
    setLoading(false);
    // Note: notifications stay unread until the user opens them (mark-on-tap in
    // handleNotificationPress) so the Unread filter + count stay meaningful.
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const { data } = await NotificationAppService.getNotifications();
    setNotifications(data);
    setRefreshing(false);
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await NotificationAppService.deleteNotification(id);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      t('notifications.clearAllTitle'),
      t('notifications.clearAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notifications.clearAll'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await NotificationAppService.clearAllNotifications();
            if (!error) {
              setNotifications([]);
            }
          },
        },
      ]
    );
  };

  const sectionLabel = (group: TimeGroup): string => {
    switch (group) {
      case 'Today': return t('notifications.groupToday', { defaultValue: 'Today' });
      case 'Yesterday': return t('notifications.groupYesterday', { defaultValue: 'Yesterday' });
      case 'This Week': return t('notifications.groupThisWeek', { defaultValue: 'This Week' });
      default: return t('notifications.groupEarlier', { defaultValue: 'Earlier' });
    }
  };

  const getIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'like': return { name: 'heart', color: COLORS.ember };
      case 'comment': return { name: 'chatbubble', color: COLORS.gold };
      case 'friend_request': return { name: 'person-add', color: COLORS.moss };
      case 'friend_accepted': return { name: 'people', color: COLORS.moss };
      case 'capsule_opened': return { name: 'lock-open', color: COLORS.blue };
      case 'message': return { name: 'chatbubble-ellipses', color: COLORS.ember };
      default: return { name: 'notifications', color: COLORS.text3 };
    }
  };

  const handleNotificationPress = (notif: AppNotification) => {
    // Mark just this notification read on tap (keeps the Unread filter meaningful).
    if (!notif.is_read) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      NotificationAppService.markAsRead(notif.id);
    }
    if (notif.type === 'message' && notif.from_user_id) {
      onNavigate('Chat', {
        otherUserId: notif.from_user_id,
        title: notif.from_profile?.display_name || notif.from_profile?.username || t('capDetail.someone'),
      });
      return;
    }
    if (notif.from_user_id && (notif.type === 'friend_request' || notif.type === 'friend_accepted')) {
      onNavigate('FriendProfile', {
        friend: {
          id: notif.from_user_id,
          username: notif.from_profile?.username || '',
          display_name: notif.from_profile?.display_name || '',
          avatar_url: notif.from_profile?.avatar_url,
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('notifications.title')}
        onBack={onGoBack}
        borderBottom
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
                <Text style={styles.clearAllText}>{t('notifications.clearAll')}</Text>
              </TouchableOpacity>
            )}
            <MessagesButton onPress={() => onNavigate('Messages')} />
          </View>
        )}
      />

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsContainer}
        contentContainerStyle={styles.filterChipsContent}
      >
        {NOTIF_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const label =
            filter === 'Unread'
              ? t('notifications.filterUnread', { defaultValue: 'Unread' }) +
                (unreadCount > 0 ? ` (${unreadCount})` : '')
              : t('notifications.filter' + filter);
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <SkeletonList count={7} avatar="circle" />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => (item.kind === 'section' ? `section-${item.group}` : item.notif.id)}
          contentContainerStyle={(listData.length === 0 && activeTrails.length === 0) ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={activeTrails.length > 0 ? (
            <View style={styles.trailsSection}>
              <Text style={styles.trailsTitle}>{t('notifications.activeTrails')}</Text>
              {activeTrails.map((tr) => {
                const ct = getCapType('trail');
                return (
                  <TouchableOpacity key={tr.id} style={styles.trailRow} onPress={() => { setSelected(tr); setShowDetail(true); }} activeOpacity={0.8}>
                    <View style={[styles.trailIcon, { backgroundColor: `${ct.color}22` }]}><CapTypeIcon size={20} color={ct.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trailName} numberOfLines={1}>{tr.title || ct.name}</Text>
                      <Text style={styles.trailSub}>{t('notifications.trailStop', { n: (tr._currentIdx || 0) + 1 })}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ember} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={56} color={COLORS.text3} />
              <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('notifications.emptyText')}</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => onNavigate('Discover')} activeOpacity={0.85}>
                <Ionicons name="compass-outline" size={18} color={COLORS.white} />
                <Text style={styles.emptyCtaText}>{t('tabs.discover')}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'section') {
              return <Text style={styles.sectionHeader}>{sectionLabel(item.group)}</Text>;
            }
            const notif = item.notif;
            const icon = getIcon(notif.type);
            return (
              <TouchableOpacity
                style={[styles.notifRow, !notif.is_read && styles.notifUnread]}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.7}
              >
                {/* Avatar or icon */}
                <View style={styles.notifLeft}>
                  {notif.from_profile?.avatar_url ? (
                    <Image source={{ uri: notif.from_profile.avatar_url }} style={styles.notifAvatar} />
                  ) : (
                    <View style={[styles.notifIconCircle, { backgroundColor: icon.color + '20' }]}>
                      <Ionicons name={icon.name as any} size={20} color={icon.color} />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.notifContent}>
                  <Text style={styles.notifText}>
                    <Text style={styles.notifBold}>
                      {notif.from_profile?.display_name || notif.from_profile?.username || t('notifications.someone')}
                    </Text>
                    {' '}{notif.message}
                  </Text>
                  <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
                </View>

                {!notif.is_read && <View style={styles.unreadDot} />}

                <View style={styles.notifActions}>
                  {/* Inline View action — mirrors demo n.actionLabel */}
                  <TouchableOpacity
                    style={[styles.viewBtn, !notif.is_read && styles.viewBtnUnread]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleNotificationPress(notif);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.viewBtnText, !notif.is_read && styles.viewBtnTextUnread]}>
                      {t('notifications.view', { defaultValue: 'View' })}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete button */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notif.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <CapsuleDetailModal visible={showDetail} capsule={selected} onClose={() => setShowDetail(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    ...font('bodyBold'),
    color: COLORS.danger,
  },
  filterChipsContainer: {
    maxHeight: 48,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.ember,
    borderColor: COLORS.ember,
  },
  filterChipText: {
    ...font('label'),
    color: COLORS.text2,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingBottom: 124 }, // clear the floating glass tab bar
  trailsSection: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  trailsTitle: { ...font('eyebrow'), color: COLORS.text2, marginBottom: SPACING.sm },
  trailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  trailIcon: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  trailName: { ...font('bodyBold'), color: COLORS.text },
  trailSub: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  empty: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    ...font('subtitle'),
    color: COLORS.text,
  },
  emptyText: {
    ...font('body'),
    color: COLORS.text3,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.ember,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.xl,
  },
  emptyCtaText: {
    ...font('labelBold'),
    fontSize: 14,
    color: COLORS.white,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.ember,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  notifUnread: {
    backgroundColor: COLORS.emberSoft,
  },
  notifLeft: {},
  notifAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    ...font('body'),
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 19,
  },
  notifBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  notifTime: {
    ...font('caption'),
    color: COLORS.text3,
    marginTop: 3,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    ...font('eyebrow'),
    color: COLORS.text3,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  notifActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewBtn: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  viewBtnUnread: {
    backgroundColor: COLORS.emberSoft,
    borderColor: COLORS.ember,
  },
  viewBtnText: {
    ...font('label'),
    color: COLORS.text2,
  },
  viewBtnTextUnread: {
    color: COLORS.ember,
  },
});

export default NotificationsScreen;
