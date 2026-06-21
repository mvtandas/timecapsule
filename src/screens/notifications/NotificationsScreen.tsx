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
import { timeAgo } from '../../utils/dateUtils';
import { SkeletonList } from '../../components/common/Skeleton';
import ScreenHeader from '../../components/common/ScreenHeader';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface NotificationsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

type NotifFilter = 'All' | 'Likes' | 'Comments' | 'Friends';

const NOTIF_FILTERS: NotifFilter[] = ['All', 'Likes', 'Comments', 'Friends'];

const NotificationsScreen = ({ onNavigate, onGoBack }: NotificationsScreenProps) => {
  const t = useT();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('All');

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    if (activeFilter === 'Likes') return notifications.filter((n) => n.type === 'like');
    if (activeFilter === 'Comments') return notifications.filter((n) => n.type === 'comment');
    if (activeFilter === 'Friends')
      return notifications.filter(
        (n) => n.type === 'friend_request' || n.type === 'friend_accepted'
      );
    return notifications;
  }, [notifications, activeFilter]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await NotificationAppService.getNotifications();
    setNotifications(data);
    setLoading(false);
    // Mark all as read on the server, then reflect it locally so the unread
    // accent stays consistent with the backend (no stale "unread" dots).
    await NotificationAppService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const { data } = await NotificationAppService.getNotifications();
    setNotifications(data);
    setRefreshing(false);
    await NotificationAppService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
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

  const getIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'like': return { name: 'heart', color: COLORS.ember };
      case 'comment': return { name: 'chatbubble', color: COLORS.gold };
      case 'friend_request': return { name: 'person-add', color: COLORS.moss };
      case 'friend_accepted': return { name: 'people', color: COLORS.moss };
      case 'capsule_opened': return { name: 'lock-open', color: COLORS.blue };
      default: return { name: 'notifications', color: COLORS.text3 };
    }
  };

  const handleNotificationPress = (notif: AppNotification) => {
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
        right={notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>{t('notifications.clearAll')}</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsContainer}
        contentContainerStyle={styles.filterChipsContent}
      >
        {NOTIF_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
              {t('notifications.filter' + filter)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonList count={7} avatar="circle" />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : styles.listContent}
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
            const icon = getIcon(item.type);
            return (
              <TouchableOpacity
                style={[styles.notifRow, !item.is_read && styles.notifUnread]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
              >
                {/* Avatar or icon */}
                <View style={styles.notifLeft}>
                  {item.from_profile?.avatar_url ? (
                    <Image source={{ uri: item.from_profile.avatar_url }} style={styles.notifAvatar} />
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
                      {item.from_profile?.display_name || item.from_profile?.username || t('notifications.someone')}
                    </Text>
                    {' '}{item.message}
                  </Text>
                  <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
                </View>

                {!item.is_read && <View style={styles.unreadDot} />}

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteNotification(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
});

export default NotificationsScreen;
