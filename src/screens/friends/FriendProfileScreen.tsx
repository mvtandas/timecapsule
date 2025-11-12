import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { FriendService, FriendshipStatus } from '../../services/friendService';
import { ProfileVisitService } from '../../services/profileVisitService';
import { CapsuleService } from '../../services/capsuleService';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';

const { width } = Dimensions.get('window');

type FriendProfileUser = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

interface FriendProfileScreenProps {
  onNavigate: (screen: string, data?: any, replace?: boolean) => void;
  onGoBack?: () => void;
  friend: {
    id: string;
    username?: string | null;
    display_name?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    friends_since?: string | null;
  };
}

type CapsuleSummary = {
  id: string;
  owner_id: string;
  title: string | null;
  description: string | null;
  content_refs: any[] | null;
  open_at: string | null;
  created_at: string;
  is_public: boolean;
  lat: number | null;
  lng: number | null;
  shared_at?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'none';
};

type ActivityEvent = {
  id: string;
  icon: string;
  message: string;
  timestamp: string | null;
};

const FriendProfileScreen = ({ onGoBack, friend }: FriendProfileScreenProps) => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<FriendProfileUser | null>(null);
  const [sharedCapsules, setSharedCapsules] = useState<CapsuleSummary[]>([]);
  const [publicCapsules, setPublicCapsules] = useState<CapsuleSummary[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleSummary | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ status: 'none' });
  const [sendingRequest, setSendingRequest] = useState<boolean>(false);

  const viewedProfileId = friend?.id;

  const displayName = useMemo(() => {
    return profile?.display_name || friend?.display_name || friend?.name || 'TimeCapsule User';
  }, [profile?.display_name, friend?.display_name, friend?.name]);

  const username = useMemo(() => {
    return profile?.username || friend?.username || 'unknown';
  }, [profile?.username, friend?.username]);

  const avatarUrl = useMemo(() => {
    return profile?.avatar_url || friend?.avatar_url || null;
  }, [profile?.avatar_url, friend?.avatar_url]);

  const formatTimeAgo = useCallback((dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 5) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${diffYears}y ago`;
  }, []);

  const getMediaUrl = (capsule: CapsuleSummary): string | null => {
    const refs = capsule.content_refs;
    if (!refs || refs.length === 0) return null;
    const firstItem = refs[0];
    if (typeof firstItem === 'string') {
      return firstItem;
    }
    if (firstItem && typeof firstItem === 'object') {
      if (firstItem.url) return firstItem.url;
      if (firstItem.file_url) return firstItem.file_url;
      if (firstItem.media_url) return firstItem.media_url;
    }
    return null;
  };

  const isCapsuleLocked = (capsule: CapsuleSummary): boolean => {
    if (!capsule.open_at) return false;
    const openDate = new Date(capsule.open_at);
    return openDate.getTime() > Date.now();
  };

  const formatOpenLabel = (capsule: CapsuleSummary): string | null => {
    if (!capsule.open_at) return null;
    const openDate = new Date(capsule.open_at);
    const now = Date.now();
    if (openDate.getTime() <= now) {
      return `Opened ${formatTimeAgo(capsule.open_at)}`;
    }
    const diffMs = openDate.getTime() - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'Opens tomorrow';
    if (diffDays < 7) return `Opens in ${diffDays} days`;
    return `Opens on ${openDate.toLocaleDateString()}`;
  };

  const buildActivityFeed = (publicList: CapsuleSummary[], sharedList: CapsuleSummary[]) => {
    const events: ActivityEvent[] = [];
    const uniqueCaps = new Map<string, CapsuleSummary>();

    publicList.forEach((capsule) => {
      uniqueCaps.set(capsule.id, capsule);
    });

    sharedList.forEach((capsule) => {
      if (!uniqueCaps.has(capsule.id)) {
        uniqueCaps.set(capsule.id, capsule);
      } else {
        const existing = uniqueCaps.get(capsule.id);
        if (existing && !existing.shared_at && capsule.shared_at) {
          uniqueCaps.set(capsule.id, { ...existing, shared_at: capsule.shared_at });
        }
      }
    });

    uniqueCaps.forEach((capsule) => {
      events.push({
        id: `created-${capsule.id}`,
        icon: '📍',
        message: `Dropped "${capsule.title || 'Untitled Capsule'}"`,
        timestamp: capsule.created_at,
      });

      if (capsule.shared_at) {
        events.push({
          id: `shared-${capsule.id}-${capsule.shared_at}`,
          icon: '🤝',
          message: 'Shared a capsule with you',
          timestamp: capsule.shared_at,
        });
      }

      if (capsule.open_at) {
        const openDate = new Date(capsule.open_at);
        const now = new Date();
        if (openDate <= now) {
          events.push({
            id: `opened-${capsule.id}`,
            icon: '🗝️',
            message: `Opened "${capsule.title || 'Untitled Capsule'}"`,
            timestamp: capsule.open_at,
          });
        } else {
          const openLabel = formatOpenLabel(capsule);
          events.push({
            id: `unlock-${capsule.id}`,
            icon: '🔒',
            message: `Capsule unlocks ${openLabel}`,
            timestamp: capsule.open_at,
          });
        }
      }
    });

    events.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return events.slice(0, 12);
  };

  const loadProfileData = async () => {
    console.log('🔍 FriendProfileScreen: Starting loadProfileData for userId:', viewedProfileId);
    
    if (!viewedProfileId) {
      console.error('❌ FriendProfileScreen: No viewedProfileId provided');
      setError('Profile not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('👤 Current user:', currentUser?.id);

      // Track profile visit (only if not viewing own profile)
      if (currentUser && currentUser.id !== viewedProfileId) {
        await ProfileVisitService.trackVisit(viewedProfileId);
      }

      // Fetch profile basics
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, created_at')
        .eq('id', viewedProfileId)
        .maybeSingle();

      console.log('📊 Profile data fetched:', profileData);
      
      if (profileError) {
        console.error('❌ Profile fetch error:', profileError.message);
      }

      if (!profileData) {
        console.error('❌ No profile data found for userId:', viewedProfileId);
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setProfile({
        id: viewedProfileId,
        display_name: profileData?.display_name || 'TimeCapsule User',
        username: profileData?.username || null,
        avatar_url: profileData?.avatar_url || null,
        created_at: profileData?.created_at || null,
      });

      // Fetch accessible capsules (public + shared with current user)
      // RLS policy will automatically filter:
      // 1. Public capsules by this user
      // 2. Private capsules shared with current user (via shared_with array)
      const { data: accessibleData, error: capsulesError } = await CapsuleService.getAccessibleCapsulesForUser(viewedProfileId);

      if (capsulesError) {
        console.error('❌ Capsules error:', capsulesError);
      }

      console.log('📦 Accessible capsules:', accessibleData?.length || 0);

      // Separate into public and shared lists
      const publicList: CapsuleSummary[] = [];
      const sharedList: CapsuleSummary[] = [];

      (accessibleData || []).forEach((capsule) => {
        const capsuleSummary: CapsuleSummary = {
          id: capsule.id,
          owner_id: capsule.owner_id,
          title: capsule.title,
          description: capsule.description,
          content_refs: capsule.content_refs,
          open_at: capsule.open_at,
          created_at: capsule.created_at,
          is_public: capsule.is_public,
          lat: capsule.lat,
          lng: capsule.lng,
          shared_at: null,
          media_url: capsule.media_url,
          media_type: capsule.media_type,
        };

        if (capsule.is_public) {
          publicList.push(capsuleSummary);
        } else {
          // Private capsule shared with current user
          sharedList.push({ ...capsuleSummary, shared_at: capsule.created_at });
        }
      });

      setPublicCapsules(publicList);
      setSharedCapsules(sharedList);

      console.log('📊 Public:', publicList.length, 'Shared:', sharedList.length);

      const activity = buildActivityFeed(publicList, sharedList);
      setActivityEvents(activity);

      // Load friendship status
      if (currentUser && currentUser.id !== viewedProfileId) {
        const status = await FriendService.getFriendshipStatus(viewedProfileId);
        setFriendshipStatus(status);
        console.log('🤝 Friendship status:', status);
      }
      
      console.log('✅ Profile data loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load public profile:', err);
      setError('Unable to load profile right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 FriendProfileScreen mounted, viewedProfileId:', viewedProfileId);
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedProfileId]);

  const handleAddFriend = async () => {
    if (!viewedProfileId) return;

    try {
      setSendingRequest(true);

      if (friendshipStatus.status === 'none') {
        // Send friend request
        const { error } = await FriendService.sendFriendRequest(viewedProfileId);
        
        if (error) {
          console.error('Error sending friend request:', error);
          return;
        }

        // Update local state
        const newStatus = await FriendService.getFriendshipStatus(viewedProfileId);
        setFriendshipStatus(newStatus);
        console.log('✅ Friend request sent successfully');
      } else if (friendshipStatus.status === 'pending_sent' && friendshipStatus.requestId) {
        // Cancel friend request
        const { error } = await FriendService.cancelFriendRequest(friendshipStatus.requestId);
        
        if (error) {
          console.error('Error canceling friend request:', error);
          return;
        }

        setFriendshipStatus({ status: 'none' });
        console.log('✅ Friend request canceled');
      } else if (friendshipStatus.status === 'friends' && friendshipStatus.requestId) {
        // Unfriend
        const { error } = await FriendService.unfriend(friendshipStatus.requestId);
        
        if (error) {
          console.error('Error unfriending:', error);
          return;
        }

        setFriendshipStatus({ status: 'none' });
        console.log('✅ Unfriended successfully');
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    } finally {
      setSendingRequest(false);
    }
  };

  const getButtonConfig = () => {
    const isOwnProfile = user?.id === viewedProfileId;

    if (isOwnProfile) {
      return null; // Don't show button on own profile
    }

    switch (friendshipStatus.status) {
      case 'friends':
        return {
          label: 'Friends',
          icon: 'person-remove' as const,
          disabled: false,
          style: styles.friendButton,
        };
      case 'pending_sent':
        return {
          label: 'Request Sent',
          icon: 'time' as const,
          disabled: false,
          style: styles.pendingButton,
        };
      case 'pending_received':
        return {
          label: 'Accept Request',
          icon: 'person-add' as const,
          disabled: false,
          style: styles.addButton,
        };
      case 'none':
      default:
        return {
          label: 'Add Friend',
          icon: 'person-add' as const,
          disabled: false,
          style: styles.addButton,
        };
    }
  };

  const renderCapsuleCard = (capsule: CapsuleSummary) => {
    const mediaUrl = getMediaUrl(capsule);
    const locked = isCapsuleLocked(capsule);
    const openLabel = formatOpenLabel(capsule);

    return (
      <TouchableOpacity
        key={capsule.id}
        style={styles.capsuleCard}
        activeOpacity={0.85}
        onPress={() => setSelectedCapsule(capsule)}
      >
        <View style={styles.capsuleMedia}>
          {mediaUrl ? (
            <Image source={{ uri: mediaUrl }} style={styles.capsuleImage} resizeMode="cover" />
          ) : (
            <View style={styles.capsulePlaceholder}>
              <Ionicons name="image-outline" size={32} color={COLORS.text.tertiary} />
            </View>
          )}
          {locked && (
            <BlurView intensity={65} tint="dark" style={styles.capsuleLockOverlay}>
              <Ionicons name="lock-closed" size={20} color="white" />
              <Text style={styles.capsuleLockText}>Locked</Text>
            </BlurView>
          )}
        </View>
        <View style={styles.capsuleInfo}>
          <Text style={styles.capsuleTitle}>{capsule.title || 'Untitled Capsule'}</Text>
          <Text style={styles.capsuleTimestamp}>
            Dropped {formatTimeAgo(capsule.created_at)}
          </Text>
          {capsule.shared_at && (
            <View style={styles.tag}>
              <Ionicons name="people" size={14} color="#0f172a" />
              <Text style={styles.tagText}>Shared with you {formatTimeAgo(capsule.shared_at)}</Text>
            </View>
          )}
          {openLabel && (
            <View style={[styles.tag, styles.openTag]}>
              <Ionicons name={locked ? 'lock-closed' : 'unlock'} size={14} color="#0f172a" />
              <Text style={styles.tagText}>{openLabel}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCapsuleSection = (
    title: string,
    capsules: CapsuleSummary[],
    emptyMessage: string,
    helperText?: string
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{capsules.length}</Text>
      </View>
      {helperText ? <Text style={styles.sectionHelper}>{helperText}</Text> : null}
      {capsules.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={24} color={COLORS.text.tertiary} />
          <Text style={styles.emptyStateText}>{emptyMessage}</Text>
        </View>
      ) : (
        <View style={styles.capsuleList}>{capsules.map(renderCapsuleCard)}</View>
      )}
    </View>
  );

  const renderActivitySection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>
      {activityEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={24} color={COLORS.text.tertiary} />
          <Text style={styles.emptyStateText}>No recent activity yet.</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {activityEvents.map((event) => (
            <View key={event.id} style={styles.activityItem}>
              <Text style={styles.activityIcon}>{event.icon}</Text>
              <View style={styles.activityInfo}>
                <Text style={styles.activityMessage}>{event.message}</Text>
                <Text style={styles.activityTimestamp}>{formatTimeAgo(event.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onGoBack && onGoBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.gradient.pink} />
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <Ionicons name="alert-circle" size={28} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.profileSection}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={60} color={COLORS.text.tertiary} />
                </View>
              )}
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.username}>@{username}</Text>
              {friend.friends_since ? (
                <Text style={styles.metaText}>Friends since {friend.friends_since}</Text>
              ) : null}
              {profile?.created_at ? (
                <Text style={styles.metaSubtext}>
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </Text>
              ) : null}
              
              {/* Add Friend Button */}
              {(() => {
                const buttonConfig = getButtonConfig();
                if (!buttonConfig) return null;

                const isAddButton = friendshipStatus.status === 'none' || friendshipStatus.status === 'pending_received';

                return (
                  <TouchableOpacity
                    style={[styles.actionButton, !isAddButton && buttonConfig.style]}
                    onPress={handleAddFriend}
                    disabled={buttonConfig.disabled || sendingRequest}
                    activeOpacity={0.7}
                  >
                    {isAddButton ? (
                      <LinearGradient
                        colors={['#ED62EF', '#6A56FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        {sendingRequest ? (
                          <ActivityIndicator size="small" color={COLORS.text.primary} />
                        ) : (
                          <>
                            <Ionicons name={buttonConfig.icon} size={18} color={COLORS.text.primary} />
                            <Text style={styles.actionButtonText}>{buttonConfig.label}</Text>
                          </>
                        )}
                      </LinearGradient>
                    ) : (
                      <>
                        {sendingRequest ? (
                          <ActivityIndicator size="small" color={COLORS.text.primary} />
                        ) : (
                          <>
                            <Ionicons name={buttonConfig.icon} size={18} color={COLORS.text.primary} />
                            <Text style={styles.actionButtonText}>{buttonConfig.label}</Text>
                          </>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })()}
            </View>

            {renderCapsuleSection(
              'Shared With You',
              sharedCapsules,
              user && user.id !== viewedProfileId
                ? 'No capsules have been shared with you yet.'
                : 'Share capsules with your friends to see them here.',
              user && user.id === viewedProfileId
                ? 'You are viewing your own profile. Capsules you share with friends will appear here.'
                : undefined
            )}

            {renderCapsuleSection(
              'Public Capsules',
              publicCapsules,
              'This explorer keeps their memories private for now.'
            )}

            {renderActivitySection()}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedCapsule}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedCapsule(null)}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity
            style={styles.detailBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedCapsule(null)}
          />
          {selectedCapsule && (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedCapsule.title || 'Untitled Capsule'}</Text>
                <TouchableOpacity onPress={() => setSelectedCapsule(null)}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.detailSubtitle}>
                Dropped {formatTimeAgo(selectedCapsule.created_at)}
              </Text>
              {selectedCapsule.open_at && (
                <Text style={styles.detailSubtitle}>{formatOpenLabel(selectedCapsule)}</Text>
              )}
              <View style={styles.detailImageWrapper}>
                {(() => {
                  const mediaUrl = getMediaUrl(selectedCapsule);
                  const locked = isCapsuleLocked(selectedCapsule);
                  return mediaUrl ? (
                    <View style={styles.detailImageContainer}>
                      <Image source={{ uri: mediaUrl }} style={styles.detailImage} resizeMode="cover" />
                      {locked && (
                        <BlurView intensity={70} tint="dark" style={styles.detailImageOverlay}>
                          <Ionicons name="lock-closed" size={28} color="white" />
                          <Text style={styles.detailLockedText}>Locked</Text>
                        </BlurView>
                      )}
                    </View>
                  ) : (
                    <View style={styles.detailPlaceholder}>
                      <Ionicons name="image-outline" size={40} color={COLORS.text.tertiary} />
                      <Text style={styles.detailPlaceholderText}>No preview available</Text>
                    </View>
                  );
                })()}
              </View>
              <View style={styles.detailFooter}>
                <Text style={styles.detailFooterText}>
                  Only public capsules or those shared with you are visible here.
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.tertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: COLORS.background.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 20,
    ...SHADOWS.soft,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  loadingState: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorState: {
    padding: 32,
    margin: 16,
    borderRadius: 16,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.status.error,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background.tertiary,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.gradient.purple,
    shadowColor: COLORS.gradient.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.gradient.purple,
    shadowColor: COLORS.gradient.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  metaSubtext: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
    minWidth: 160,
    ...SHADOWS.pink,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
    minWidth: 160,
  },
  addButton: {
    backgroundColor: COLORS.gradient.pink,
    shadowColor: COLORS.gradient.pink,
  },
  pendingButton: {
    backgroundColor: COLORS.text.tertiary,
  },
  friendButton: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.gradient.purple,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.background.secondary,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  sectionHelper: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginBottom: 12,
  },
  capsuleList: {
    gap: 16,
  },
  capsuleCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  capsuleMedia: {
    width: width * 0.28,
    height: width * 0.28,
    backgroundColor: COLORS.background.tertiary,
  },
  capsuleImage: {
    width: '100%',
    height: '100%',
  },
  capsulePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
  },
  capsuleLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  capsuleLockText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  capsuleInfo: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: 'center',
    gap: 8,
  },
  capsuleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  capsuleTimestamp: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background.tertiary,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  openTag: {
    backgroundColor: COLORS.background.tertiary,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  activityTimestamp: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailCard: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 16,
  },
  detailSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  detailImageWrapper: {
    marginTop: 16,
    marginBottom: 20,
  },
  detailImageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.background.tertiary,
    height: width * 0.6,
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  detailLockedText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  detailPlaceholder: {
    height: width * 0.6,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailPlaceholderText: {
    color: COLORS.text.tertiary,
  },
  detailFooter: {
    backgroundColor: COLORS.background.tertiary,
    padding: 14,
    borderRadius: 16,
  },
  detailFooterText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default FriendProfileScreen;


