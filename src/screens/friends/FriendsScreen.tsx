import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getRecentVisits, addRecentVisit, RecentVisit } from '../../utils/recentVisits';

interface FriendsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ onNavigate }) => {
  // Recent visits (replaces static friends data)
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent visits on mount
  useEffect(() => {
    loadRecentVisits();
  }, []);

  const loadRecentVisits = async () => {
    const visits = await getRecentVisits();
    setRecentVisits(visits);
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

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
});

export default FriendsScreen;
