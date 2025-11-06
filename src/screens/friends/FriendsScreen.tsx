import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getRecentVisits, addRecentVisit, RecentVisit } from '../../utils/recentVisits';

interface FriendsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

interface FriendWithActivity {
  id: string;
  username: string;
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

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent visits and friends on mount
  useEffect(() => {
    loadRecentVisits();
    loadFriends();
  }, []);

  const loadRecentVisits = async () => {
    const visits = await getRecentVisits();
    setRecentVisits(visits);
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

      // For now, get users who have interacted with current user's capsules
      // or users the current user has shared capsules with
      const { data: capsulesData, error: capsulesError } = await supabase
        .from('capsules')
        .select('created_by, shared_with')
        .or(`created_by.eq.${user.id},shared_with.cs.{${user.id}}`);

      if (capsulesError) {
        console.error('Error fetching capsules:', capsulesError);
        setLoadingFriends(false);
        return;
      }

      // Extract unique user IDs (friends)
      const friendIds = new Set<string>();
      capsulesData?.forEach(capsule => {
        if (capsule.created_by && capsule.created_by !== user.id) {
          friendIds.add(capsule.created_by);
        }
        if (capsule.shared_with && Array.isArray(capsule.shared_with)) {
          capsule.shared_with.forEach((id: string) => {
            if (id !== user.id) friendIds.add(id);
          });
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
        console.error('Error fetching profiles:', profilesError);
        setLoadingFriends(false);
        return;
      }

      // Get last capsule for each friend
      const friendsWithActivity: FriendWithActivity[] = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: lastCapsule } = await supabase
            .from('capsules')
            .select('title, lat, lng, created_at')
            .eq('created_by', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

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
      console.error('Error loading friends:', error);
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
        console.error('Search error:', error);
        return;
      }

      setSearchResults(data || []);
      setShowSearchDropdown(true);
    } catch (error) {
      console.error('Search failed:', error);
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
      username: friend.username,
      display_name: friend.display_name,
      avatar_url: friend.avatar_url,
    });
    
    // Reload recent visits
    await loadRecentVisits();
    
    onNavigate('FriendProfile', { friend });
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Friends</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Find Friends</Text>
          
          <View style={styles.userSearchContainer}>
            <View style={styles.userSearchInputWrapper}>
              <Ionicons name="search" size={20} color="#94a3b8" style={styles.userSearchIcon} />
              <TextInput
                style={styles.userSearchInput}
                placeholder="Search by username"
                placeholderTextColor="#94a3b8"
                value={userSearchQuery}
                onChangeText={handleUserSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#FAC638" style={styles.searchLoader} />
              )}
            </View>

            {/* Search Dropdown */}
            {showSearchDropdown && (
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
                          <View style={[styles.searchResultAvatar, styles.searchResultAvatarPlaceholder]}>
                            <Ionicons name="person" size={20} color="#94a3b8" />
                          </View>
                        )}
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultUsername}>@{user.username}</Text>
                          {user.display_name && (
                            <Text style={styles.searchResultName}>{user.display_name}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.searchEmptyState}>
                    <Ionicons name="search-outline" size={32} color="#cbd5e1" />
                    <Text style={styles.searchEmptyText}>No users found</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Recent Visits Section */}
        <View style={styles.friendsListSection}>
          <Text style={styles.sectionTitle}>
            Recent Visits {recentVisits.length > 0 && `(${recentVisits.length})`}
          </Text>
          
          {recentVisits.length > 0 ? (
            <View style={styles.friendsGrid}>
              {recentVisits.map((visit) => (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.friendCard}
                  onPress={() => handleRecentVisitPress(visit)}
                  activeOpacity={0.7}
                >
                  {visit.avatar_url ? (
                    <Image source={{ uri: visit.avatar_url }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                      <Ionicons name="person" size={32} color="#94a3b8" />
                    </View>
                  )}
                  <Text style={styles.friendName} numberOfLines={1}>
                    {visit.display_name || `@${visit.username}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No recent visits</Text>
              <Text style={styles.emptyStateSubtext}>
                Search for users above and visit their profiles to see them here
              </Text>
            </View>
          )}
        </View>

        {/* My Friends Section - Full List */}
        <View style={styles.allFriendsSection}>
          <Text style={styles.sectionTitle}>
            My Friends {friends.length > 0 && `(${friends.length})`}
          </Text>
          
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
                  style={[
                    styles.friendListItem,
                    index < friends.length - 1 && styles.friendListItemBorder
                  ]}
                  onPress={() => handleFriendPress(friend)}
                  activeOpacity={0.7}
                >
                  {/* Left: Avatar */}
                  {friend.avatar_url ? (
                    <Image source={{ uri: friend.avatar_url }} style={styles.friendListAvatar} />
                  ) : (
                    <View style={[styles.friendListAvatar, styles.friendListAvatarPlaceholder]}>
                      <Ionicons name="person" size={24} color="#94a3b8" />
                    </View>
                  )}

                  {/* Center: Name and Username */}
                  <View style={styles.friendListInfo}>
                    <Text style={styles.friendListName} numberOfLines={1}>
                      {friend.display_name || friend.username}
                    </Text>
                    {friend.display_name && (
                      <Text style={styles.friendListUsername} numberOfLines={1}>
                        @{friend.username}
                      </Text>
                    )}
                  </View>

                  {/* Right: Activity Indicator */}
                  <View style={styles.friendListActivity}>
                    {friend.lastCapsule ? (
                      <>
                        <View style={styles.activityRow}>
                          <Ionicons name="time-outline" size={14} color="#64748b" />
                          <Text style={styles.activityText} numberOfLines={1}>
                            {formatTimeAgo(friend.lastCapsule.created_at)}
                          </Text>
                        </View>
                        {friend.lastCapsule.location && (
                          <View style={styles.activityRow}>
                            <Ionicons name="location-outline" size={14} color="#64748b" />
                            <Text style={styles.activityText} numberOfLines={1}>
                              {friend.lastCapsule.title}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={styles.activityTextMuted}>No activity</Text>
                    )}
                  </View>

                  {/* Chevron */}
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={styles.friendListChevron} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No friends yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start by creating and sharing capsules with others
              </Text>
            </View>
          )}
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  userSearchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  userSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  userSearchIcon: {
    marginRight: 8,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
    zIndex: 1001,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchResultAvatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchResultName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  searchEmptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  friendsListSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  friendCard: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
  },
  friendAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  friendAvatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  // All Friends Section - List View
  allFriendsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  friendsList: {
    marginTop: 8,
  },
  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  friendListItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  friendListAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  friendListAvatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendListInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  friendListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  friendListUsername: {
    fontSize: 14,
    color: '#64748b',
  },
  friendListActivity: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    maxWidth: 120,
  },
  activityTextMuted: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  friendListChevron: {
    marginLeft: 4,
  },
});

export default FriendsScreen;
