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
import { getMediaUrl, isLocked } from '../../utils/mediaUtils';
import { timeAgo } from '../../utils/dateUtils';
import { COLORS, GRADIENTS, RADIUS, SPACING, font } from '../../constants/theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useT } from '../../i18n';
import { AchievementService, type AchievementSummary } from '../../services/achievementService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

type FriendProfileUser = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  bio?: string | null;
  location?: string | null;
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

const FriendProfileScreen = ({ onNavigate, onGoBack, friend }: FriendProfileScreenProps) => {
  const t = useT();
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
  const [mutualCount, setMutualCount] = useState(0);
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null);

  const viewedProfileId = friend?.id;

  const displayName = useMemo(() => {
    return profile?.display_name || friend?.display_name || friend?.name || t('friendProfile.defaultName');
  }, [profile?.display_name, friend?.display_name, friend?.name]);

  const username = useMemo(() => {
    return profile?.username || friend?.username || 'unknown';
  }, [profile?.username, friend?.username]);

  const avatarUrl = useMemo(() => {
    return profile?.avatar_url || friend?.avatar_url || null;
  }, [profile?.avatar_url, friend?.avatar_url]);

  const bio = useMemo(() => profile?.bio?.trim() || null, [profile?.bio]);
  const location = useMemo(() => profile?.location?.trim() || null, [profile?.location]);

  const loadProfileData = async () => {
    if (!viewedProfileId) {
      setError(t('friendProfile.errorNotFound'));
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
        .select('id, display_name, username, avatar_url, created_at, bio, location')
        .eq('id', viewedProfileId)
        .maybeSingle();

      if (profileError || !profileData) {
        setError(t('friendProfile.errorNotFound'));
        setLoading(false);
        return;
      }

      setProfile({
        id: viewedProfileId,
        display_name: profileData.display_name || t('friendProfile.defaultName'),
        username: profileData.username || null,
        avatar_url: profileData.avatar_url || null,
        created_at: profileData.created_at || null,
        bio: (profileData as any).bio || null,
        location: (profileData as any).location || null,
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

      // Load this user's earned badges (best-effort — never blocks the profile).
      try {
        const summary = await AchievementService.compute(viewedProfileId);
        setAchievements(summary);
      } catch {
        setAchievements(null);
      }

      // Fetch friends count (and the friend's friend IDs for mutuals)
      const { data: friendsData } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${viewedProfileId},receiver_id.eq.${viewedProfileId}`);

      const theirFriendIds = new Set<string>();
      (friendsData || []).forEach((r: any) => {
        theirFriendIds.add(r.sender_id === viewedProfileId ? r.receiver_id : r.sender_id);
      });
      setFriendsCount(theirFriendIds.size);

      // Load friendship status + compute mutual friends
      if (currentUser && currentUser.id !== viewedProfileId) {
        const status = await FriendService.getFriendshipStatus(viewedProfileId);
        setFriendshipStatus(status);

        const { data: myFriends } = await FriendService.getFriends();
        const mutual = (myFriends || []).filter(
          (id) => id !== viewedProfileId && theirFriendIds.has(id)
        ).length;
        setMutualCount(mutual);
      }
    } catch (err) {
      setError(t('friendProfile.errorLoad'));
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
      t('friendProfile.optionsTitle'),
      undefined,
      [
        {
          text: t('friendProfile.reportUser'),
          onPress: () => {
            Alert.alert(
              t('friendProfile.reportUser'),
              t('friendProfile.selectReason'),
              [
                ...REPORT_REASONS.map((reason) => ({
                  text: reason,
                  onPress: async () => {
                    const { error } = await ReportService.reportContent('user', viewedProfileId, reason);
                    if (error) {
                      Alert.alert(t('friendProfile.errorTitle'), t('friendProfile.reportFailed'));
                    } else {
                      Alert.alert(t('friendProfile.reportedTitle'), t('friendProfile.reportThanks'));
                    }
                  },
                })),
                { text: t('common.cancel'), style: 'cancel' },
              ]
            );
          },
        },
        {
          text: t('friendProfile.blockUser'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('friendProfile.blockUser'),
              t('friendProfile.blockConfirm', { name: displayName }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('friendProfile.blockAction'),
                  style: 'destructive',
                  onPress: async () => {
                    const { error } = await ReportService.blockUser(viewedProfileId);
                    if (error) {
                      Alert.alert(t('friendProfile.errorTitle'), t('friendProfile.blockFailed'));
                    } else {
                      Alert.alert(t('friendProfile.blockedTitle'), t('friendProfile.blockedMessage'), [
                        { text: t('friendProfile.ok'), onPress: () => onGoBack?.() },
                      ]);
                    }
                  },
                },
              ]
            );
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const renderActionButton = () => {
    if (user?.id === viewedProfileId) return null;

    let label = t('friendProfile.addFriend');
    let bgColor: string = COLORS.ember;
    let textColor: string = COLORS.white;
    let borderColor: string = COLORS.ember;
    let iconName: keyof typeof Ionicons.glyphMap = 'person-add';
    let outlined = false;
    let disabled = false;

    switch (friendshipStatus.status) {
      case 'friends':
        label = t('friendProfile.friends') + ' \u2713';
        iconName = 'checkmark-circle';
        bgColor = 'transparent';
        textColor = COLORS.text;
        borderColor = COLORS.borderLight;
        outlined = true;
        disabled = true;
        break;
      case 'pending_sent':
        label = t('friendProfile.requestSent');
        iconName = 'time';
        bgColor = 'transparent';
        textColor = COLORS.text3;
        borderColor = COLORS.borderLight;
        outlined = true;
        break;
      case 'pending_received':
        label = t('friendProfile.accept');
        iconName = 'checkmark';
        bgColor = COLORS.success;
        textColor = COLORS.white;
        borderColor = COLORS.success;
        break;
      case 'none':
      default:
        break;
    }

    const canMessage = friendshipStatus.status === 'friends';
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: bgColor,
              borderWidth: outlined ? 1.5 : 0,
              borderColor: borderColor,
              flex: 1,
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
        {canMessage && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.borderLight, paddingHorizontal: 16 }]}
            onPress={() => onNavigate('Chat', { otherUserId: viewedProfileId, title: displayName })}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('messages.send_message')}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`@${username}`}
        onBack={onGoBack}
        right={user?.id !== viewedProfileId ? (
          <TouchableOpacity style={styles.backButton} onPress={handleMoreOptions} accessibilityRole="button">
            <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.ember} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={28} color={COLORS.danger} />
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
                      <Ionicons name="person" size={44} color={COLORS.ember} />
                    </View>
                  )}
                </View>
              </View>

              {/* Name */}
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.username}>@{username}</Text>

              {/* Location */}
              {!!location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.text3} />
                  <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                </View>
              )}

              {/* Bio */}
              {!!bio && <Text style={styles.bio}>{bio}</Text>}

              {/* Mutual friends pill */}
              {mutualCount > 0 && user?.id !== viewedProfileId && (
                <View style={styles.mutualPill}>
                  <Ionicons name="people" size={13} color={COLORS.ember} />
                  <Text style={styles.mutualText}>
                    {t('friendProfile.mutualFriends', {
                      defaultValue: '{{count}} mutual',
                      count: mutualCount,
                    })}
                  </Text>
                </View>
              )}

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Ionicons name="time" size={16} color={COLORS.ember} />
                  <Text style={styles.statValue}>{capsulesCount}</Text>
                  <Text style={styles.statLabel}>{t('friendProfile.statCaps')}</Text>
                </View>

                <View style={styles.statPill}>
                  <Ionicons name="people" size={16} color={COLORS.ember} />
                  <Text style={styles.statValue}>{friendsCount}</Text>
                  <Text style={styles.statLabel}>{t('friendProfile.statFriends')}</Text>
                </View>

                <View style={styles.statPill}>
                  <Ionicons name="flame" size={16} color={COLORS.ember} />
                  <Text style={styles.statValue}>{daysActive}</Text>
                  <Text style={styles.statLabel}>{t('friendProfile.statDays')}</Text>
                </View>
              </View>

              {/* Action Button */}
              {renderActionButton()}
            </View>

            {/* Achievements showcase — only when there's at least one earned badge */}
            {!!achievements && achievements.unlockedCount > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t('friendProfile.achievements', { defaultValue: 'Achievements' })}
                  </Text>
                  <Text style={styles.sectionCount}>
                    {t('friendProfile.achievementsUnlocked', {
                      defaultValue: '{{count}}/{{total}} unlocked',
                      count: achievements.unlockedCount,
                      total: achievements.totalCount,
                    })}
                  </Text>
                </View>
                <View style={styles.badgesRow}>
                  {achievements.achievements
                    .filter((a) => a.unlocked)
                    .map((a) => {
                      const tierColor =
                        achievements.tiers.find((tr) => tr.id === a.tier)?.color || COLORS.ember;
                      return (
                        <View key={a.id} style={styles.badge}>
                          <View
                            style={[styles.badgeIcon, { backgroundColor: `${tierColor}22`, borderColor: `${tierColor}55` }]}
                          >
                            <Ionicons name={a.icon as any} size={20} color={tierColor} />
                          </View>
                          <Text style={styles.badgeLabel} numberOfLines={1}>{a.name}</Text>
                        </View>
                      );
                    })}
                </View>
              </>
            )}

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('friendProfile.publicCaps')}</Text>
              {publicCapsules.length > 0 && (
                <Text style={styles.sectionCount}>{publicCapsules.length}</Text>
              )}
            </View>

            {/* Capsules - 2 column card layout */}
            {publicCapsules.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="time-outline" size={40} color={COLORS.ember} />
                </View>
                <Text style={styles.emptyTitle}>{t('friendProfile.emptyTitle')}</Text>
                <Text style={styles.emptyText}>
                  {t('friendProfile.emptyText')}
                </Text>
              </View>
            ) : (
              <View style={styles.cardsGrid}>
                {publicCapsules.map((capsule, index) => {
                  const mediaUrl = getMediaUrl(capsule);
                  const locked = isLocked(capsule.open_at);

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
                            colors={GRADIENTS.ember}
                            style={styles.cardImagePlaceholder}
                          >
                            <Ionicons name="time" size={28} color={COLORS.white} />
                          </LinearGradient>
                        )}
                        {locked && (
                          <View style={styles.cardLockBadge}>
                            <Ionicons name="lock-closed" size={12} color={COLORS.white} />
                          </View>
                        )}
                        {capsule.is_public && (
                          <View style={styles.cardPublicBadge}>
                            <Ionicons name="globe-outline" size={10} color={COLORS.white} />
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
    backgroundColor: COLORS.bg,
  },

  // Header
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: COLORS.ember,
    padding: 3,
    backgroundColor: COLORS.card,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: COLORS.bg3,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: COLORS.emberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Name
  displayName: {
    ...font('display'),
    color: COLORS.text,
  },
  username: {
    ...font('body'),
    fontSize: 14,
    color: COLORS.text3,
    marginTop: 2,
    marginBottom: 10,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    maxWidth: '90%',
  },
  locationText: {
    fontSize: 13,
    color: COLORS.text2,
    fontWeight: '500',
  },

  // Bio
  bio: {
    ...font('body'),
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text2,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },

  // Mutual friends
  mutualPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.emberSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 14,
  },
  mutualText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ember,
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
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text2,
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
    ...font('title'),
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text3,
  },

  // Achievements showcase
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  badge: {
    alignItems: 'center',
    width: 64,
    gap: 6,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    ...font('caption'),
    color: COLORS.text2,
    textAlign: 'center',
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
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.bg3,
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
    backgroundColor: 'rgba(61,155,122,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  cardTime: {
    fontSize: 12,
    color: COLORS.text2,
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
    backgroundColor: 'rgba(231,76,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },

  // Empty
  emptyBox: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.emberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...font('title'),
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FriendProfileScreen;
