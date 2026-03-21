import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Platform, StatusBar, Modal, Animated, RefreshControl, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { getRecentVisits, addRecentVisit, RecentVisit } from '../../utils/recentVisits';
import { FriendService, FriendRequest } from '../../services/friendService';
import { timeAgo } from '../../utils/dateUtils';
import { StreakService, Streak } from '../../services/streakService';

interface FriendsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

interface FriendWithActivity {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lastCapsule?: {
    title: string;
    location?: string;
    created_at: string;
  } | null;
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onNavigate }) => {
  // Recent visits (replaces static friends data)
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  // Friends list state
  const [friends, setFriends] = useState<FriendWithActivity[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search bar visibility
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Friend requests state
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load recent visits and friends on mount
  useEffect(() => {
    loadRecentVisits();
    loadFriends();
    loadPendingRequests();
    loadStreaks();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const loadStreaks = async () => {
    const data = await StreakService.getStreaks();
    const map = new Map<string, number>();
    data.forEach(s => map.set(s.friend_id, s.current_streak));
    setStreaks(map);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadPendingRequests(), loadStreaks()]);
    setRefreshing(false);
  };

  const loadRecentVisits = async () => {
    const visits = await getRecentVisits();
    setRecentVisits(visits);
  };

  // Load pending friend requests
  const loadPendingRequests = async () => {
    try {
      const { data, error } = await FriendService.getPendingRequests();
      if (error) {
        if (__DEV__) console.error('Error loading pending requests:', error);
        return;
      }
      setPendingRequests(data || []);
    } catch (error) {
      if (__DEV__) console.error('Error loading pending requests:', error);
    }
  };

  // Open requests modal with animation
  const openRequestsModal = () => {
    setShowRequestsModal(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  // Close requests modal with animation
  const closeRequestsModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowRequestsModal(false);
    });
  };

  // Accept friend request
  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    try {
      setProcessingRequestId(requestId);

      const { error } = await FriendService.acceptFriendRequest(requestId);

      if (error) {
        if (__DEV__) console.error('Error accepting request:', error);
        return;
      }


      // Reload requests and friends
      await loadPendingRequests();
      await loadFriends();

      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      if (__DEV__) console.error('Error accepting request:', error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);

      const { error } = await FriendService.rejectFriendRequest(requestId);

      if (error) {
        if (__DEV__) console.error('Error declining request:', error);
        return;
      }


      // Reload requests
      await loadPendingRequests();

      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      if (__DEV__) console.error('Error declining request:', error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Load friends with their last activity
  const loadFriends = async () => {
    try {
      setLoadingFriends(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingFriends(false);
        return;
      }

      // Get friends from accepted friend requests
      const { data: friendRequestsData, error: friendRequestsError } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (friendRequestsError) {
        // Silently handle error - don't break the app
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      // Extract unique friend IDs
      const friendIds = new Set<string>();
      friendRequestsData?.forEach(request => {
        if (request.sender_id === user.id) {
          friendIds.add(request.receiver_id);
        } else {
          friendIds.add(request.sender_id);
        }
      });

      // Get friend profiles
      const friendIdsArray = Array.from(friendIds);
      if (friendIdsArray.length === 0) {
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIdsArray);

      if (profilesError) {
        // Silently handle error
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      // Get last capsule for each friend
      const friendsWithActivity: FriendWithActivity[] = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: lastCapsule } = await supabase
            .from('capsules')
            .select('title, lat, lng, created_at')
            .eq('owner_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...profile,
            lastCapsule: lastCapsule ? {
              title: lastCapsule.title || 'Untitled',
              location: lastCapsule.lat && lastCapsule.lng
                ? `${lastCapsule.lat.toFixed(2)}, ${lastCapsule.lng.toFixed(2)}`
                : undefined,
              created_at: lastCapsule.created_at,
            } : null,
          };
        })
      );

      setFriends(friendsWithActivity);
    } catch (error) {
      // Silently handle any errors - don't break the app
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Search users by username
  const searchUsers = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .limit(10);

      if (error) {
        if (__DEV__) console.error('Search error:', error);
        return;
      }

      setSearchResults(data || []);
      setShowSearchDropdown(true);
    } catch (error) {
      if (__DEV__) console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search handler
  const handleUserSearch = (text: string) => {
    setUserSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(text);
    }, 300);
  };

  // Handle user selection from search results
  const handleUserSelect = async (user: any) => {
    setShowSearchDropdown(false);
    setUserSearchQuery('');
    setSearchResults([]);
    setShowSearchBar(false);

    // Add to recent visits
    await addRecentVisit({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    });

    // Reload recent visits
    await loadRecentVisits();

    onNavigate('FriendProfile', { friend: user });
  };

  // Handle recent visit press
  const handleRecentVisitPress = async (visit: RecentVisit) => {
    // Update visit timestamp
    await addRecentVisit({
      id: visit.id,
      username: visit.username,
      display_name: visit.display_name,
      avatar_url: visit.avatar_url,
    });

    // Reload recent visits
    await loadRecentVisits();

    onNavigate('FriendProfile', { friend: visit });
  };

  // Handle friend press
  const handleFriendPress = async (friend: FriendWithActivity) => {
    // Add to recent visits
    await addRecentVisit({
      id: friend.id,
      username: friend.username || '',
      display_name: friend.display_name || '',
      avatar_url: friend.avatar_url || undefined,
    });

    // Reload recent visits
    await loadRecentVisits();

    onNavigate('FriendProfile', { friend });
  };

  const cancelSearch = () => {
    setShowSearchBar(false);
    setUserSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowSearchBar(!showSearchBar)}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={22} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={openRequestsModal}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={22} color="#1e293b" />
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearchBar && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username"
              placeholderTextColor="#94a3b8"
              value={userSearchQuery}
              onChangeText={handleUserSearch}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#FAC638" />
            )}
          </View>
          <TouchableOpacity onPress={cancelSearch} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results Dropdown */}
      {showSearchBar && showSearchDropdown && (
        <View style={styles.searchDropdown}>
          {searchResults.length > 0 ? (
            <ScrollView
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.searchResultItem}
                  onPress={() => handleUserSelect(user)}
                  activeOpacity={0.7}
                >
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.searchResultAvatar} />
                  ) : (
                    <View style={[styles.searchResultAvatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={18} color="#94a3b8" />
                    </View>
                  )}
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {user.display_name || user.username}
                    </Text>
                    <Text style={styles.searchResultUsername} numberOfLines={1}>
                      @{user.username}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={28} color="#cbd5e1" />
              <Text style={styles.searchEmptyText}>No users found</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FAC638" />
        }
      >
        {/* Stories Row */}
        <View style={styles.storiesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {recentVisits.length > 0 ? (
              recentVisits.map((visit) => (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.storyItem}
                  onPress={() => handleRecentVisitPress(visit)}
                  activeOpacity={0.7}
                >
                  <View style={styles.storyRing}>
                    {visit.avatar_url ? (
                      <Image source={{ uri: visit.avatar_url }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={26} color="#94a3b8" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.storyUsername} numberOfLines={1}>
                    {visit.username}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                style={styles.storyItem}
                onPress={() => setShowSearchBar(true)}
                activeOpacity={0.7}
              >
                <View style={styles.storyRingPlaceholder}>
                  <View style={[styles.storyAvatar, styles.addFriendPlaceholder]}>
                    <Ionicons name="person-add" size={24} color="#FAC638" />
                  </View>
                </View>
                <Text style={styles.storyUsername}>Add Friends</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Streaks Section */}
        {Array.from(streaks.entries()).filter(([_, count]) => count > 0).length > 0 && (
          <View style={styles.streaksSection}>
            <Text style={styles.streaksSectionTitle}>Streaks</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.streaksContent}
            >
              {Array.from(streaks.entries())
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([friendId, count]) => {
                  const friend = friends.find(f => f.id === friendId);
                  if (!friend) return null;
                  return (
                    <TouchableOpacity
                      key={friendId}
                      style={styles.streakCard}
                      onPress={() => handleFriendPress(friend)}
                      activeOpacity={0.7}
                    >
                      {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.streakAvatar} />
                      ) : (
                        <View style={[styles.streakAvatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={18} color="#94a3b8" />
                        </View>
                      )}
                      <Text style={styles.streakName} numberOfLines={1}>
                        {friend.display_name || friend.username}
                      </Text>
                      <Text style={styles.streakCount}>{'\uD83D\uDD25'} {count} days</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        )}

        {/* Pending Requests Banner */}
        {pendingRequests.length > 0 && (
          <TouchableOpacity
            style={styles.requestsBanner}
            onPress={openRequestsModal}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={20} color="#1e293b" />
            <Text style={styles.requestsBannerText}>
              You have {pendingRequests.length} friend request{pendingRequests.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#1e293b" />
          </TouchableOpacity>
        )}

        {/* Friends List */}
        {loadingFriends ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FAC638" />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friends.length > 0 ? (
          <View style={styles.friendsList}>
            {friends.map((friend, index) => (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendRow}
                onPress={() => handleFriendPress(friend)}
                activeOpacity={0.6}
              >
                {/* Avatar */}
                {friend.avatar_url ? (
                  <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                ) : (
                  <View style={[styles.friendAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={22} color="#94a3b8" />
                  </View>
                )}

                {/* Name + Username + Activity */}
                <View style={styles.friendInfo}>
                  <View style={styles.friendNameRow}>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {friend.display_name || friend.username}
                    </Text>
                    {(streaks.get(friend.id) || 0) > 0 && (
                      <Text style={styles.friendStreakBadge}>{'\uD83D\uDD25'}{streaks.get(friend.id)}</Text>
                    )}
                  </View>
                  <Text style={styles.friendActivity} numberOfLines={1}>
                    {friend.lastCapsule
                      ? `Created '${friend.lastCapsule.title}' \u2022 ${timeAgo(friend.lastCapsule.created_at)}`
                      : 'No recent activity'}
                  </Text>
                </View>

                {/* Separator */}
                {index < friends.length - 1 && <View style={styles.separator} />}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Add friends to see them here</Text>
            <Text style={styles.emptySubtitle}>
              Search for people by username or share your profile
            </Text>
            <TouchableOpacity
              style={styles.inviteFriendsButton}
              onPress={() => Share.share({ message: "I'm using TimeCapsule to preserve memories! Join me and create your own time capsules \uD83D\uDCE6\u2728" })}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={18} color="#FAC638" />
              <Text style={styles.inviteFriendsButtonText}>Invite Friends</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Friend Requests Modal */}
      <Modal
        visible={showRequestsModal}
        transparent
        animationType="none"
        onRequestClose={closeRequestsModal}
      >
        <View style={styles.modalContainer}>
          {/* Blur Background */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeRequestsModal}
          >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          </TouchableOpacity>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Friend Requests</Text>
              <TouchableOpacity onPress={closeRequestsModal} style={styles.modalCloseButton}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Requests List */}
            <ScrollView
              style={styles.requestsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.requestsListContent}
            >
              {loadingRequests ? (
                <View style={styles.modalLoadingState}>
                  <ActivityIndicator size="large" color="#FAC638" />
                  <Text style={styles.modalLoadingText}>Loading requests...</Text>
                </View>
              ) : pendingRequests.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="people-outline" size={56} color="#cbd5e1" />
                  <Text style={styles.modalEmptyText}>No new friend requests</Text>
                  <Text style={styles.modalEmptySubtext}>
                    When someone sends you a friend request, it will appear here
                  </Text>
                </View>
              ) : (
                pendingRequests.map((request) => (
                  <FriendRequestItem
                    key={request.id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                    isProcessing={processingRequestId === request.id}
                  />
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// Friend Request Item Component
interface FriendRequestItemProps {
  request: FriendRequest;
  onAccept: (requestId: string, senderId: string) => void;
  onDecline: (requestId: string) => void;
  isProcessing: boolean;
}

const FriendRequestItem: React.FC<FriendRequestItemProps> = ({
  request,
  onAccept,
  onDecline,
  isProcessing,
}) => {
  const [senderProfile, setSenderProfile] = useState<any>(null);

  useEffect(() => {
    loadSenderProfile();
  }, [request.sender_id]);

  const loadSenderProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', request.sender_id)
        .maybeSingle();

      if (error) {
        if (__DEV__) console.error('Error loading sender profile:', error);
        return;
      }

      setSenderProfile(data);
    } catch (error) {
      if (__DEV__) console.error('Error loading sender profile:', error);
    }
  };

  if (!senderProfile) {
    return (
      <View style={styles.requestItem}>
        <ActivityIndicator size="small" color="#94a3b8" />
      </View>
    );
  }

  return (
    <View style={styles.requestItem}>
      {/* Avatar */}
      {senderProfile.avatar_url ? (
        <Image source={{ uri: senderProfile.avatar_url }} style={styles.requestAvatar} />
      ) : (
        <View style={[styles.requestAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={22} color="#94a3b8" />
        </View>
      )}

      {/* Info */}
      <View style={styles.requestInfo}>
        <Text style={styles.requestName} numberOfLines={1}>
          {senderProfile.display_name || `@${senderProfile.username}`}
        </Text>
        {senderProfile.display_name && (
          <Text style={styles.requestUsername} numberOfLines={1}>
            @{senderProfile.username}
          </Text>
        )}
        <Text style={styles.requestTime}>{timeAgo(request.created_at)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(request.id, request.sender_id)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#1e293b" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => onDecline(request.id)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    backgroundColor: '#FAC638',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#1e293b',
    fontSize: 10,
    fontWeight: '800',
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  cancelButton: {
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#FAC638',
    fontWeight: '600',
  },

  // Search Dropdown
  searchDropdown: {
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    maxHeight: 280,
    zIndex: 100,
  },
  searchResultsList: {
    maxHeight: 280,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  searchResultAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchResultUsername: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 1,
  },
  searchEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },

  // Stories Row
  storiesSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    marginBottom: 8,
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
  },
  storyRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    borderColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  storyRingPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  addFriendPlaceholder: {
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyUsername: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Streaks Section
  streaksSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    marginBottom: 4,
  },
  streaksSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  streaksContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  streakCard: {
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 90,
  },
  streakAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
  },
  streakName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    maxWidth: 80,
    textAlign: 'center',
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },

  // Friend Name Row + Streak Badge
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendStreakBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  friendActivity: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  // Pending Requests Banner
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAC638',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  requestsBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },

  // Content
  content: {
    flex: 1,
  },

  // Friends List
  friendsList: {
    backgroundColor: '#ffffff',
    marginTop: 4,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  avatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: '#64748b',
  },
  friendMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: 110,
  },
  friendMetaText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  friendMetaTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  friendMetaMuted: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  separator: {
    position: 'absolute',
    left: 82,
    right: 20,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FAC638',
    backgroundColor: 'transparent',
  },
  inviteFriendsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAC638',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
    top: 28,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsList: {
    maxHeight: 500,
  },
  requestsListContent: {
    paddingBottom: 40,
  },
  modalLoadingState: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  modalEmptyState: {
    paddingVertical: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Request Item
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  requestUsername: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 3,
  },
  requestTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#FAC638',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  declineButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FriendsScreen;
