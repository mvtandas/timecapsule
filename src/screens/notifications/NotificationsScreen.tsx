import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationAppService, AppNotification } from '../../services/notificationService';
import { timeAgo } from '../../utils/dateUtils';

interface NotificationsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

type NotifFilter = 'All' | 'Likes' | 'Comments' | 'Friends';

const NOTIF_FILTERS: NotifFilter[] = ['All', 'Likes', 'Comments', 'Friends'];

const NotificationsScreen = ({ onNavigate, onGoBack }: NotificationsScreenProps) => {
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
    // Mark all as read
    await NotificationAppService.markAllAsRead();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const { data } = await NotificationAppService.getNotifications();
    setNotifications(data);
    setRefreshing(false);
    await NotificationAppService.markAllAsRead();
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await NotificationAppService.deleteNotification(id);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
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
      case 'like': return { name: 'heart', color: '#FF375F' };
      case 'comment': return { name: 'chatbubble', color: '#FAC638' };
      case 'friend_request': return { name: 'person-add', color: '#06D6A0' };
      case 'friend_accepted': return { name: 'people', color: '#06D6A0' };
      case 'capsule_opened': return { name: 'lock-open', color: '#4ECDC4' };
      default: return { name: 'notifications', color: '#94a3b8' };
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

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
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FAC638" />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FAC638" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>You're all caught up!</Text>
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
                      {item.from_profile?.display_name || item.from_profile?.username || 'Someone'}
                    </Text>
                    {' '}{item.message}
                  </Text>
                  <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteNotification(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
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
    backgroundColor: '#f8f8f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  filterChipsContainer: {
    maxHeight: 48,
    backgroundColor: '#f8f8f5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#FAC638',
    borderColor: '#FAC638',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  notifUnread: {
    backgroundColor: '#FFF8E1',
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
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 19,
  },
  notifBold: {
    fontWeight: '700',
  },
  notifTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationsScreen;
