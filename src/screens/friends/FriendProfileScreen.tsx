import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { FriendService, FriendshipStatus } from '../../services/friendService';
import { ReportService, REPORT_REASONS } from '../../services/reportService';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { getMediaUrl } from '../../utils/mediaUtils';
import { timeAgo } from '../../utils/dateUtils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

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
  media_url?: string | null;
};

const FriendProfileScreen = ({ onGoBack, friend }: FriendProfileScreenProps) => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<FriendProfileUser | null>(null);
  const [publicCapsules, setPublicCapsules] = useState<CapsuleSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleSummary | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ status: 'none' });
  const [sendingRequest, setSendingRequest] = useState<boolean>(false);
  const [capsulesCount, setCapsulesCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [daysActive, setDaysActive] = useState(0);

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

  const loadProfileData = async () => {
    if (!viewedProfileId) {
      setError('Profile not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, created_at')
        .eq('id', viewedProfileId)
        .maybeSingle();

      if (profileError || !profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setProfile({
        id: viewedProfileId,
        display_name: profileData.display_name || 'TimeCapsule User',
        username: profileData.username || null,
        avatar_url: profileData.avatar_url || null,
        created_at: profileData.created_at || null,
      });

      // Calculate days since joined
      if (profileData.created_at) {
        const joinDate = new Date(profileData.created_at);
        const now = new Date();
        const days = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
        setDaysActive(days);
      }

      // Fetch public capsules
      const { data: publicData } = await supabase
        .from('capsules')
        .select('id, owner_id, title, description, content_refs, open_at, created_at, is_public, media_url')
        .eq('owner_id', viewedProfileId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      const publicList: CapsuleSummary[] = (publicData || []).map((c) => ({ ...c }));
      setPublicCapsules(publicList);
      setCapsulesCount(publicList.length);

      // Fetch friends count
      const { data: friendsData } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${viewedProfileId},receiver_id.eq.${viewedProfileId}`);

      setFriendsCount(friendsData?.length || 0);

      // Load friendship status
      if (currentUser && currentUser.id !== viewedProfileId) {
        const status = await FriendService.getFriendshipStatus(viewedProfileId);
        setFriendshipStatus(status);
      }
    } catch (err) {
      setError('Unable to load profile right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedProfileId]);

  const handleFriendAction = async () => {
    if (!viewedProfileId) return;

    try {
      setSendingRequest(true);

      if (friendshipStatus.status === 'none') {
        const { error } = await FriendService.sendFriendRequest(viewedProfileId);
        if (error) return;
        const newStatus = await FriendService.getFriendshipStatus(viewedProfileId);
        setFriendshipStatus(newStatus);
      } else if (friendshipStatus.status === 'pending_sent' && friendshipStatus.requestId) {
        const { error } = await FriendService.cancelFriendRequest(friendshipStatus.requestId);
        if (error) return;
        setFriendshipStatus({ status: 'none' });
      } else if (friendshipStatus.status === 'pending_received' && friendshipStatus.requestId) {
        const { error } = await FriendService.acceptFriendRequest(friendshipStatus.requestId);
        if (error) return;
        const newStatus = await FriendService.getFriendshipStatus(viewedProfileId);
        setFriendshipStatus(newStatus);
      }
    } catch (_) {
      // silent
    } finally {
      setSendingRequest(false);
    }
  };

  const handleMoreOptions = () => {
    if (!viewedProfileId || user?.id === viewedProfileId) return;

    Alert.alert(
      'Options',
      undefined,
      [
        {
          text: 'Report User',
          onPress: () => {
            Alert.alert(
              'Report User',
              'Select a reason:',
              [
                ...REPORT_REASONS.map((reason) => ({
                  text: reason,
                  onPress: async () => {
                    const { error } = await ReportService.reportContent('user', viewedProfileId, reason);
                    if (error) {
                      Alert.alert('Error', 'Failed to submit report. Please try again.');
                    } else {
                      Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
                    }
                  },
                })),
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Block User',
              `Are you sure you want to block ${displayName}? You will no longer see their content.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    const { error } = await ReportService.blockUser(viewedProfileId);
                    if (error) {
                      Alert.alert('Error', 'Failed to block user. Please try again.');
                    } else {
                      Alert.alert('Blocked', 'User has been blocked.', [
                        { text: 'OK', onPress: () => onGoBack?.() },
                      ]);
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderActionButton = () => {
    if (user?.id === viewedProfileId) return null;

    let label = 'Add Friend';
    let bgColor = '#FAC638';
    let textColor = '#fff';
    let borderColor = '#FAC638';
    let iconName: keyof typeof Ionicons.glyphMap = 'person-add';
    let outlined = false;
    let disabled = false;

    switch (friendshipStatus.status) {
      case 'friends':
        label = 'Friends \u2713';
        iconName = 'checkmark-circle';
        bgColor = 'transparent';
        textColor = '#1e293b';
        borderColor = '#cbd5e1';
        outlined = true;
        disabled = true;
        break;
      case 'pending_sent':
        label = 'Request Sent';
        iconName = 'time';
        bgColor = 'transparent';
        textColor = '#94a3b8';
        borderColor = '#cbd5e1';
        outlined = true;
        break;
      case 'pending_received':
        label = 'Accept';
        iconName = 'checkmark';
        bgColor = '#06D6A0';
        textColor = '#fff';
        borderColor = '#06D6A0';
        break;
      case 'none':
      default:
        break;
    }

    return (
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: bgColor,
            borderWidth: outlined ? 1.5 : 0,
            borderColor: borderColor,
          },
        ]}
        onPress={handleFriendAction}
        disabled={disabled || sendingRequest}
        activeOpacity={0.7}
      >
        {sendingRequest ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            <Ionicons name={iconName} size={18} color={textColor} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onGoBack && onGoBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{username}</Text>
        {user?.id !== viewedProfileId ? (
          <TouchableOpacity style={styles.backButton} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-vertical" size={22} color="#1e293b" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FAC638" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={28} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Profile Hero */}
            <View style={styles.heroSection}>
              {/* Avatar - centered, NOT tappable */}
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarRing}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={44} color="#FAC638" />
                    </View>
                  )}
                </View>
              </View>

              {/* Name */}
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.username}>@{username}</Text>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Ionicons name="time" size={16} color="#FAC638" />
                  <Text style={styles.statValue}>{capsulesCount}</Text>
                  <Text style={styles.statLabel}>Capsules</Text>
                </View>

                <View style={styles.statPill}>
                  <Ionicons name="people" size={16} color="#FAC638" />
                  <Text style={styles.statValue}>{friendsCount}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </View>

                <View style={styles.statPill}>
                  <Ionicons name="flame" size={16} color="#FAC638" />
                  <Text style={styles.statValue}>{daysActive}</Text>
                  <Text style={styles.statLabel}>Days</Text>
                </View>
              </View>

              {/* Action Button */}
              {renderActionButton()}
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Public Capsules</Text>
              {publicCapsules.length > 0 && (
                <Text style={styles.sectionCount}>{publicCapsules.length}</Text>
              )}
            </View>

            {/* Capsules - 2 column card layout */}
            {publicCapsules.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="time-outline" size={40} color="#FAC638" />
                </View>
                <Text style={styles.emptyTitle}>No Public Capsules</Text>
                <Text style={styles.emptyText}>
                  This user hasn't shared any public capsules yet
                </Text>
              </View>
            ) : (
              <View style={styles.cardsGrid}>
                {publicCapsules.map((capsule, index) => {
                  const mediaUrl = getMediaUrl(capsule);
                  const isLocked = capsule.open_at && new Date(capsule.open_at).getTime() > Date.now();

                  return (
                    <TouchableOpacity
                      key={capsule.id || index}
                      style={styles.card}
                      onPress={() => setSelectedCapsule(capsule)}
                      activeOpacity={0.85}
                    >
                      {/* Card Image */}
                      <View style={styles.cardImageContainer}>
                        {mediaUrl ? (
                          <Image source={{ uri: mediaUrl }} style={styles.cardImage} resizeMode="cover" />
                        ) : (
                          <LinearGradient
                            colors={['#FAC638', '#F59E0B']}
                            style={styles.cardImagePlaceholder}
                          >
                            <Ionicons name="time" size={28} color="#fff" />
                          </LinearGradient>
                        )}
                        {isLocked && (
                          <View style={styles.cardLockBadge}>
                            <Ionicons name="lock-closed" size={12} color="#fff" />
                          </View>
                        )}
                        {capsule.is_public && (
                          <View style={styles.cardPublicBadge}>
                            <Ionicons name="globe-outline" size={10} color="#fff" />
                          </View>
                        )}
                      </View>

                      {/* Card Info */}
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{capsule.title}</Text>
                        <Text style={styles.cardTime}>{timeAgo(capsule.created_at)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Capsule Detail */}
      <CapsuleDetailModal
        visible={!!selectedCapsule}
        capsule={selectedCapsule}
        capsules={publicCapsules}
        onClose={() => setSelectedCapsule(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fafaf8',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FAC638',
    padding: 3,
    backgroundColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Name
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 18,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPublicBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(6,214,160,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
  },
  cardTime: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Loading
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  // Error
  errorContainer: {
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

  // Empty
  emptyBox: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FriendProfileScreen;
