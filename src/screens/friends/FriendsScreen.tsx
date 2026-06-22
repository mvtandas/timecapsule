import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Modal, Animated, RefreshControl, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { getRecentVisits, addRecentVisit, RecentVisit } from '../../utils/recentVisits';
import { FriendService, FriendRequest } from '../../services/friendService';
import { SearchService } from '../../services/searchService';
import { timeAgo } from '../../utils/dateUtils';
import { StreakService, Streak } from '../../services/streakService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface FriendsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
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
  const t = useT();
  const insets = useSafeAreaInsets();

  // Recent visits (replaces static friends data)
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  // Friends list state
  const [friends, setFriends] = useState<FriendWithActivity[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());

  // Tab + suggested users ("Find people")
  const [activeTab, setActiveTab] = useState<'friends' | 'discover'>('friends');
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [suggestedLoaded, setSuggestedLoaded] = useState(false);
  // user id -> 'sending' | 'sent'
  const [requestStates, setRequestStates] = useState<Record<string, 'sending' | 'sent'>>({});

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

  // Load suggested users ("Find people")
  const loadSuggested = async () => {
    try {
      setLoadingSuggested(true);
      const data = await SearchService.getSuggestedUsers(20);
      setSuggested(data || []);
    } catch (error) {
      if (__DEV__) console.error('Error loading suggested users:', error);
      setSuggested([]);
    } finally {
      setLoadingSuggested(false);
      setSuggestedLoaded(true);
    }
  };

  // Switch tabs; lazy-load suggestions the first time the discover tab opens
  const handleTabChange = (tab: 'friends' | 'discover') => {
    setActiveTab(tab);
    if (tab === 'discover' && !suggestedLoaded) {
      loadSuggested();
    }
  };

  // Send a friend request to a suggested user (optimistic)
  const handleSendRequest = async (suggestedUser: any) => {
    if (requestStates[suggestedUser.id]) return;
    setRequestStates(prev => ({ ...prev, [suggestedUser.id]: 'sending' }));
    const { error } = await FriendService.sendFriendRequest(suggestedUser.id);
    if (error) {
      setRequestStates(prev => {
        const next = { ...prev };
        delete next[suggestedUser.id];
        return next;
      });
      return;
    }
    setRequestStates(prev => ({ ...prev, [suggestedUser.id]: 'sent' }));
  };

  // Open a suggested user's profile
  const handleSuggestedPress = async (suggestedUser: any) => {
    await addRecentVisit({
      id: suggestedUser.id,
      username: suggestedUser.username || '',
      display_name: suggestedUser.display_name || '',
      avatar_url: suggestedUser.avatar_url || undefined,
    });
    await loadRecentVisits();
    onNavigate('FriendProfile', { friend: suggestedUser });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const tasks: Promise<any>[] = [loadFriends(), loadPendingRequests(), loadStreaks()];
    if (activeTab === 'discover') tasks.push(loadSuggested());
    await Promise.all(tasks);
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
              title: lastCapsule.title || t('friends.untitled'),
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
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.headerTitle}>{t('friends.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowSearchBar(!showSearchBar)}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={openRequestsModal}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={22} color={COLORS.text} />
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
            <Ionicons name="search" size={18} color={COLORS.text3} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('friends.search_placeholder')}
              placeholderTextColor={COLORS.text3}
              value={userSearchQuery}
              onChangeText={handleUserSearch}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {isSearching && (
              <ActivityIndicator size="small" color={COLORS.ember} />
            )}
          </View>
          <TouchableOpacity onPress={cancelSearch} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
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
                      <Ionicons name="person" size={18} color={COLORS.text3} />
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
                  <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={28} color={COLORS.text3} />
              <Text style={styles.searchEmptyText}>{t('friends.no_users_found')}</Text>
            </View>
          )}
        </View>
      )}

      {/* Segmented control: Friends | Find people */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'friends' && styles.segmentActive]}
          onPress={() => handleTabChange('friends')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'friends' && styles.segmentTextActive]}>
            {t('friends.tab_friends', { defaultValue: 'Friends' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'discover' && styles.segmentActive]}
          onPress={() => handleTabChange('discover')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'discover' && styles.segmentTextActive]}>
            {t('friends.tab_discover', { defaultValue: 'Find people' })}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ember} />
        }
      >
        {activeTab === 'discover' ? (
          <View style={styles.suggestedSection}>
            {loadingSuggested ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.ember} />
                <Text style={styles.loadingText}>{t('friends.loading_suggested', { defaultValue: 'Finding people…' })}</Text>
              </View>
            ) : suggested.length > 0 ? (
              <>
                <Text style={styles.suggestedHeader}>
                  {t('friends.suggested_title', { defaultValue: 'Suggested for you' })}
                </Text>
                {suggested.map((sUser, index) => {
                  const state = requestStates[sUser.id];
                  return (
                    <TouchableOpacity
                      key={sUser.id}
                      style={styles.friendRow}
                      onPress={() => handleSuggestedPress(sUser)}
                      activeOpacity={0.6}
                    >
                      {sUser.avatar_url ? (
                        <Image source={{ uri: sUser.avatar_url }} style={styles.friendAvatar} />
                      ) : (
                        <View style={[styles.friendAvatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={22} color={COLORS.text3} />
                        </View>
                      )}

                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName} numberOfLines={1}>
                          {sUser.display_name || sUser.username}
                        </Text>
                        {!!sUser.username && (
                          <Text style={styles.friendUsername} numberOfLines={1}>
                            @{sUser.username}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.addButton, state === 'sent' && styles.addButtonSent]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleSendRequest(sUser);
                        }}
                        disabled={!!state}
                        activeOpacity={0.7}
                      >
                        {state === 'sending' ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : state === 'sent' ? (
                          <>
                            <Ionicons name="checkmark" size={15} color={COLORS.text3} />
                            <Text style={styles.addButtonSentText}>
                              {t('friends.request_sent', { defaultValue: 'Sent' })}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="person-add" size={15} color={COLORS.white} />
                            <Text style={styles.addButtonText}>
                              {t('friends.add', { defaultValue: 'Add' })}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {index < suggested.length - 1 && <View style={styles.separator} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="sparkles-outline" size={52} color={COLORS.text3} />
                <Text style={styles.emptyTitle}>{t('friends.suggested_empty_title', { defaultValue: 'No suggestions right now' })}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('friends.suggested_empty_subtitle', { defaultValue: 'Check back later or search for people by username.' })}
                </Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </View>
        ) : (
        <>
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
                        <Ionicons name="person" size={26} color={COLORS.text3} />
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
                    <Ionicons name="person-add" size={24} color={COLORS.ember} />
                  </View>
                </View>
                <Text style={styles.storyUsername}>{t('friends.add_friends')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Streaks Section */}
        {Array.from(streaks.entries()).filter(([_, count]) => count > 0).length > 0 && (
          <View style={styles.streaksSection}>
            <Text style={styles.streaksSectionTitle}>{t('friends.streaks_title')}</Text>
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
                          <Ionicons name="person" size={18} color={COLORS.text3} />
                        </View>
                      )}
                      <Text style={styles.streakName} numberOfLines={1}>
                        {friend.display_name || friend.username}
                      </Text>
                      <Text style={styles.streakCount}>{'\uD83D\uDD25'} {t('friends.streak_days', { count })}</Text>
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
            <Ionicons name="people" size={20} color={COLORS.white} />
            <Text style={styles.requestsBannerText}>
              {pendingRequests.length === 1
                ? t('friends.requests_banner_one', { count: pendingRequests.length })
                : t('friends.requests_banner_other', { count: pendingRequests.length })}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {/* Friends List */}
        {loadingFriends ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.ember} />
            <Text style={styles.loadingText}>{t('friends.loading_friends')}</Text>
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
                    <Ionicons name="person" size={22} color={COLORS.text3} />
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
                      ? t('friends.friend_activity', { title: friend.lastCapsule.title, time: timeAgo(friend.lastCapsule.created_at) })
                      : t('friends.no_recent_activity')}
                  </Text>
                </View>

                {/* Separator */}
                {index < friends.length - 1 && <View style={styles.separator} />}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={52} color={COLORS.text3} />
            <Text style={styles.emptyTitle}>{t('friends.empty_title')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('friends.empty_subtitle')}
            </Text>
            <TouchableOpacity
              style={styles.inviteFriendsButton}
              onPress={() => Share.share({ message: t('friends.invite_share_message') })}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={18} color={COLORS.ember} />
              <Text style={styles.inviteFriendsButtonText}>{t('friends.invite_friends')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
        </>
        )}
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
              <Text style={styles.modalTitle}>{t('friends.requests_modal_title')}</Text>
              <TouchableOpacity onPress={closeRequestsModal} style={styles.modalCloseButton}>
                <Ionicons name="close-circle" size={28} color={COLORS.text3} />
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
                  <ActivityIndicator size="large" color={COLORS.ember} />
                  <Text style={styles.modalLoadingText}>{t('friends.loading_requests')}</Text>
                </View>
              ) : pendingRequests.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="people-outline" size={56} color={COLORS.text3} />
                  <Text style={styles.modalEmptyText}>{t('friends.requests_empty_title')}</Text>
                  <Text style={styles.modalEmptySubtext}>
                    {t('friends.requests_empty_subtitle')}
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
  const t = useT();
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
        <ActivityIndicator size="small" color={COLORS.text3} />
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
          <Ionicons name="person" size={22} color={COLORS.text3} />
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
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.acceptButtonText}>{t('friends.accept')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => onDecline(request.id)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={COLORS.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...font('display'),
    fontSize: 26,
    color: COLORS.text,
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
    backgroundColor: COLORS.ember,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  cancelButton: {
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    color: COLORS.ember,
    fontWeight: '600',
  },

  // Search Dropdown
  searchDropdown: {
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
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
    borderBottomColor: COLORS.border,
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
    color: COLORS.text,
  },
  searchResultUsername: {
    fontSize: 13,
    color: COLORS.text2,
    marginTop: 1,
  },
  searchEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchEmptyText: {
    fontSize: 14,
    color: COLORS.text3,
    marginTop: 8,
  },

  // Stories Row
  storiesSection: {
    backgroundColor: COLORS.bg2,
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
    borderColor: COLORS.ember,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  storyRingPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    borderColor: COLORS.borderLight,
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
    backgroundColor: COLORS.emberSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyUsername: {
    fontSize: 11,
    color: COLORS.text2,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Streaks Section
  streaksSection: {
    backgroundColor: COLORS.bg2,
    paddingVertical: 14,
    marginBottom: 4,
  },
  streaksSectionTitle: {
    ...font('subtitle'),
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  streaksContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  streakCard: {
    alignItems: 'center',
    backgroundColor: COLORS.emberSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 90,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
    marginBottom: 4,
    maxWidth: 80,
    textAlign: 'center',
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ember,
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
    color: COLORS.ember,
  },
  friendActivity: {
    fontSize: 12,
    color: COLORS.text2,
    marginTop: 2,
  },

  // Pending Requests Banner
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ember,
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
    color: COLORS.white,
  },

  // Content
  content: {
    flex: 1,
  },

  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg3,
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: COLORS.card,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text3,
  },
  segmentTextActive: {
    color: COLORS.text,
  },

  // Suggested ("Find people")
  suggestedSection: {
    backgroundColor: COLORS.bg2,
    marginTop: 4,
  },
  suggestedHeader: {
    ...font('subtitle'),
    color: COLORS.text2,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.ember,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 76,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  addButtonSent: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  addButtonSentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text3,
  },

  // Friends List
  friendsList: {
    backgroundColor: COLORS.bg2,
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
    backgroundColor: COLORS.bg3,
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
    color: COLORS.text,
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: COLORS.text2,
  },
  friendMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: 110,
  },
  friendMetaText: {
    fontSize: 12,
    color: COLORS.text2,
    marginBottom: 2,
  },
  friendMetaTime: {
    fontSize: 11,
    color: COLORS.text3,
  },
  friendMetaMuted: {
    fontSize: 12,
    color: COLORS.text3,
    fontStyle: 'italic',
  },
  separator: {
    position: 'absolute',
    left: 82,
    right: 20,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
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
    color: COLORS.text2,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text3,
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
    borderColor: COLORS.ember,
    backgroundColor: 'transparent',
  },
  inviteFriendsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ember,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text2,
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
    backgroundColor: COLORS.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    marginBottom: 14,
  },
  modalTitle: {
    ...font('title'),
    color: COLORS.text,
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
    color: COLORS.text2,
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
    color: COLORS.text2,
    marginTop: 16,
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: COLORS.text3,
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
    borderBottomColor: COLORS.border,
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
    color: COLORS.text,
    marginBottom: 2,
  },
  requestUsername: {
    fontSize: 13,
    color: COLORS.text2,
    marginBottom: 3,
  },
  requestTime: {
    fontSize: 12,
    color: COLORS.text3,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: COLORS.ember,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  declineButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FriendsScreen;
