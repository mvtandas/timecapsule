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
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

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

  const viewedProfileId = friend?.id;

  const displayName = useMemo(() => {
    return (
      profile?.display_name ||
      friend.display_name ||
      friend.name ||
      friend.username ||
      'TimeCapsule User'
    );
  }, [profile?.display_name, friend.display_name, friend.name, friend.username]);

  const username = useMemo(() => {
    return profile?.username || friend.username || friend.name || 'unknown';
  }, [profile?.username, friend.username, friend.name]);

  const avatarUrl = profile?.avatar_url || friend.avatar_url || null;

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

  const buildActivityFeed = useCallback(
    (publicList: CapsuleSummary[], sharedList: CapsuleSummary[]) => {
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
            events.push({
              id: `unlock-${capsule.id}`,
              icon: '🔒',
              message: `Capsule unlocks ${formatOpenLabel(capsule)}`,
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
    },
    [formatOpenLabel]
  );

  const loadProfileData = useCallback(async () => {
    if (!viewedProfileId) {
      setError('Profile not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Fetch profile basics
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', viewedProfileId)
        .maybeSingle();

      setProfile({
        id: viewedProfileId,
        display_name:
          profileData?.display_name ||
          friend.display_name ||
          friend.name ||
          friend.username ||
          'TimeCapsule User',
        username: friend.username || null,
        avatar_url: profileData?.avatar_url || friend.avatar_url || null,
        created_at: profileData?.created_at || null,
      });

      // Fetch public capsules
      const { data: publicData, error: publicError } = await supabase
        .from('capsules')
        .select('id, owner_id, title, description, content_refs, open_at, created_at, is_public, lat, lng')
        .eq('owner_id', viewedProfileId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (publicError) {
        console.error('Public capsules error:', publicError);
      }

      const publicList: CapsuleSummary[] = (publicData || []).map((capsule) => ({
        ...capsule,
        shared_at: null,
      }));

      setPublicCapsules(publicList);

      // Fetch shared capsules (only if current user is different from viewed profile)
      let sharedList: CapsuleSummary[] = [];
      if (currentUser && currentUser.id !== viewedProfileId) {
        const { data: sharedData, error: sharedError } = await supabase
          .from('shared_capsules')
          .select('capsule_id, created_at, capsules (id, owner_id, title, description, content_refs, open_at, created_at, is_public, lat, lng)')
          .eq('user_id', currentUser.id)
          .eq('capsules.owner_id', viewedProfileId)
          .order('created_at', { ascending: false });

        if (sharedError) {
          console.error('Shared capsules error:', sharedError);
        }

        sharedList =
          sharedData
            ?.map((item: any) => {
              if (!item.capsules) return null;
              return {
                ...(item.capsules as CapsuleSummary),
                shared_at: item.created_at as string,
              };
            })
            .filter(Boolean) ?? [];

        setSharedCapsules(sharedList);
      } else {
        setSharedCapsules([]);
      }

      const activity = buildActivityFeed(publicList, sharedList);
      setActivityEvents(activity);
    } catch (err) {
      console.error('Failed to load public profile:', err);
      setError('Unable to load profile right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [viewedProfileId, friend.display_name, friend.name, friend.username, friend.avatar_url, buildActivityFeed]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

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
              <Ionicons name="image-outline" size={32} color="#94a3b8" />
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
          <Ionicons name="sparkles-outline" size={24} color="#94a3b8" />
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
          <Ionicons name="time-outline" size={24} color="#94a3b8" />
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
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
            <ActivityIndicator size="large" color="#FAC638" />
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
                  <Ionicons name="person" size={60} color="#94a3b8" />
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
                      <Ionicons name="image-outline" size={40} color="#94a3b8" />
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
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
    color: '#64748b',
  },
  errorState: {
    padding: 32,
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#475569',
  },
  metaSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  sectionHelper: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  capsuleList: {
    gap: 16,
  },
  capsuleCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#e2e8f0',
  },
  capsuleImage: {
    width: '100%',
    height: '100%',
  },
  capsulePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
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
    color: '#0f172a',
  },
  capsuleTimestamp: {
    fontSize: 13,
    color: '#64748b',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e2e8f0',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  openTag: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94a3b8',
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
    color: '#0f172a',
    fontWeight: '600',
  },
  activityTimestamp: {
    fontSize: 13,
    color: '#94a3b8',
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
    backgroundColor: 'white',
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
    color: '#0f172a',
    flex: 1,
    marginRight: 16,
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  detailImageWrapper: {
    marginTop: 16,
    marginBottom: 20,
  },
  detailImageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
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
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailPlaceholderText: {
    color: '#94a3b8',
  },
  detailFooter: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 16,
  },
  detailFooterText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default FriendProfileScreen;


