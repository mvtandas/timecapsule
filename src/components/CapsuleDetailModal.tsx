import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  StatusBar,
  FlatList,
  Animated,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import CommentSheet from './CommentSheet';
import EditCapsuleSheet from './EditCapsuleSheet';
import ReactionBar from './ReactionBar';
import { getMediaUrl, isLocked } from '../utils/mediaUtils';
import { formatDate, timeAgo } from '../utils/dateUtils';
import { ChainService } from '../services/chainService';
import { ReportService, REPORT_REASONS } from '../services/reportService';

const { width, height } = Dimensions.get('window');

interface CapsuleDetailModalProps {
  visible: boolean;
  capsule: any;
  capsules?: any[];
  onClose: () => void;
  onOwnerPress?: (owner: any) => void;
  onExplore?: () => void;
}

// Single capsule story page
const CapsulePage = ({ item, onClose, onOwnerPress, onPause }: { item: any; onClose: () => void; onOwnerPress?: (owner: any) => void; onPause?: (paused: boolean) => void }) => {
  const [owner, setOwner] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [chainCount, setChainCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(item?.title || '');
  const [displayDescription, setDisplayDescription] = useState(item?.description || '');
  const [displayCategory, setDisplayCategory] = useState(item?.category || '');

  useEffect(() => {
    setOwner(null);
    setAddress(null);
    setDisplayTitle(item?.title || '');
    setDisplayDescription(item?.description || '');
    setDisplayCategory(item?.category || '');
    if (item?.owner_id) loadOwner(item.owner_id);
    if (item?.lat && item?.lng) loadAddress(item.lat, item.lng);
    if (item?.id) loadCommentCount();
    if (item?.id) loadChainCount();
    checkOwnership();
  }, [item?.id]);

  const checkOwnership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && item?.owner_id) {
        setIsOwner(user.id === item.owner_id);
      }
    } catch (e) {
      // silently fail
    }
  };

  const handleMoreOptions = () => {
    Alert.alert(
      'Options',
      undefined,
      [
        {
          text: 'Report Capsule',
          onPress: () => {
            Alert.alert(
              'Report Capsule',
              'Select a reason:',
              [
                ...REPORT_REASONS.map((reason) => ({
                  text: reason,
                  onPress: async () => {
                    const { error } = await ReportService.reportContent('capsule', item.id, reason);
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
              `Are you sure you want to block ${owner?.display_name || owner?.username || 'this user'}? You will no longer see their content.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    if (!item?.owner_id) return;
                    const { error } = await ReportService.blockUser(item.owner_id);
                    if (error) {
                      Alert.alert('Error', 'Failed to block user. Please try again.');
                    } else {
                      Alert.alert('Blocked', 'User has been blocked.');
                      onClose();
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

  useEffect(() => {
    onPause?.(showComments || showEditSheet);
  }, [showComments, showEditSheet]);

  const loadChainCount = async () => {
    const count = await ChainService.getChainCount(item.id);
    setChainCount(count);
  };

  const loadCommentCount = async () => {
    const { CommentService } = require('../services/commentService');
    const count = await CommentService.getCommentCount(item.id);
    setCommentCount(count);
  };


  const loadOwner = async (ownerId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('id', ownerId)
        .maybeSingle();
      setOwner(data);
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const loadAddress = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const a = results[0];
        setAddress([a.city, a.region].filter(Boolean).join(', '));
      }
    } catch (e) { if (__DEV__) console.error(e); }
  };

  const mediaUrl = getMediaUrl(item);
  const locked = isLocked(item?.open_at);

  return (
    <View style={styles.page}>
      {/* Background image */}
      {mediaUrl && !locked ? (
        <Image source={{ uri: mediaUrl }} style={styles.bgImage} resizeMode="cover" />
      ) : (
        <View style={[styles.bgImage, { backgroundColor: '#1a1a2e' }]} />
      )}

      {/* Top gradient */}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={styles.topGradient} />

      {/* Bottom gradient */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.bottomGradient} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.ownerRow}
          onPress={() => owner && onOwnerPress?.(owner)}
          disabled={!onOwnerPress || !owner}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            {owner?.avatar_url ? (
              <Image source={{ uri: owner.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={16} color="#fff" />
            )}
          </View>
          <Text style={styles.ownerName} numberOfLines={1}>
            {owner?.display_name || owner?.username || '...'}
          </Text>
          <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          {!isOwner && (
            <TouchableOpacity onPress={handleMoreOptions} style={styles.moreBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center locked */}
      {locked && (
        <View style={styles.centerContent}>
          <View style={styles.lockedCircle}>
            <Ionicons name="lock-closed" size={34} color="#FAC638" />
          </View>
          <Text style={styles.lockedTitle}>Locked</Text>
          {item.open_at && <Text style={styles.lockedDate}>Opens {formatDate(item.open_at)}</Text>}
        </View>
      )}

      {/* Center no media */}
      {!mediaUrl && !locked && (
        <View style={styles.centerContent}>
          <Ionicons name="time-outline" size={52} color="rgba(255,255,255,0.4)" />
        </View>
      )}

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        <Text style={styles.title}>{displayTitle}</Text>
        {displayDescription ? (
          <Text style={styles.description} numberOfLines={3}>{displayDescription}</Text>
        ) : null}

        {/* Reactions */}
        <ReactionBar capsuleId={item.id} />

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setShowComments(true)} style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Share.share({ message: `Check out "${displayTitle}" on TimeCapsule!` })}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onClose()}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="git-branch-outline" size={22} color="#fff" />
            {chainCount > 0 && <Text style={styles.actionCount}>{chainCount}</Text>}
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              onPress={() => setShowEditSheet(true)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}

          <View style={styles.actionSpacer} />

          {displayCategory && displayCategory !== 'general' && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{displayCategory}</Text>
            </View>
          )}

          {address && (
            <View style={styles.pill}>
              <Ionicons name="location-outline" size={13} color="#fff" />
              <Text style={styles.pillText} numberOfLines={1}>{address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Comment Sheet */}
      <CommentSheet
        capsuleId={item.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onCountChange={(count) => setCommentCount(count)}
      />

      {/* Edit Capsule Sheet */}
      <EditCapsuleSheet
        capsuleId={item.id}
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        initialTitle={displayTitle}
        initialDescription={displayDescription}
        initialCategory={displayCategory}
        onSaved={(updated) => {
          setDisplayTitle(updated.title);
          setDisplayDescription(updated.description);
          setDisplayCategory(updated.category);
        }}
      />
    </View>
  );
};

const STORY_DURATION = 5000; // 5 seconds per capsule

const CapsuleDetailModal: React.FC<CapsuleDetailModalProps> = ({
  visible,
  capsule,
  capsules,
  onClose,
  onOwnerPress,
  onExplore,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressAnims = useRef<Animated.Value[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const list = capsules && capsules.length > 0 ? capsules : capsule ? [capsule] : [];

  const initialIndex = capsule && list.length > 1
    ? Math.max(0, list.findIndex((c: any) => c.id === capsule.id))
    : 0;

  // Initialize progress anims when list changes
  useEffect(() => {
    progressAnims.current = list.map(() => new Animated.Value(0));
  }, [list.length]);

  // Reset and start when modal opens
  useEffect(() => {
    if (visible && list.length > 0) {
      // Reset all bars
      progressAnims.current.forEach(a => a.setValue(0));
      // Fill completed bars before initial
      for (let i = 0; i < initialIndex; i++) {
        progressAnims.current[i]?.setValue(1);
      }
      setActiveIndex(initialIndex);

      // Scroll to initial
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);

      startTimer(initialIndex);
    }
    return () => stopTimer();
  }, [visible, capsule?.id]);

  const fillBarsUpTo = (index: number) => {
    progressAnims.current.forEach((a, i) => {
      if (i < index) a.setValue(1);
      else if (i > index) a.setValue(0);
    });
  };

  const startTimer = (index: number) => {
    stopTimer();
    fillBarsUpTo(index);
    const anim = progressAnims.current[index];
    if (!anim) return;

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNext(index);
      }
    });
  };

  const stopTimer = () => {
    progressAnims.current.forEach(a => a.stopAnimation());
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goToNext = (currentIndex: number) => {
    progressAnims.current[currentIndex]?.setValue(1);
    const next = currentIndex + 1;
    if (next >= list.length) {
      if (onExplore) {
        onExplore();
      } else {
        onClose();
      }
      return;
    }
    setActiveIndex(next);
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    startTimer(next);
  };

  const goToPrev = (currentIndex: number) => {
    progressAnims.current[currentIndex]?.setValue(0);
    const prev = currentIndex - 1;
    if (prev < 0) {
      startTimer(0);
      return;
    }
    progressAnims.current[prev]?.setValue(0);
    setActiveIndex(prev);
    flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    startTimer(prev);
  };

  const handleScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < list.length) {
      setActiveIndex(newIndex);
      startTimer(newIndex);
    }
  };

  // Tap left/right to navigate (disabled when paused/comments open)
  const handleTap = (tapX: number) => {
    if (paused) return;
    if (tapX < width * 0.3) {
      goToPrev(activeIndex);
    } else if (tapX > width * 0.7) {
      goToNext(activeIndex);
    }
  };

  if (!capsule) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Progress bars */}
        {list.length > 1 && (
          <View style={styles.progressContainer}>
            {list.map((_, i) => (
              <View key={i} style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnims.current[i]
                        ? progressAnims.current[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : i < activeIndex ? '100%' : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={list}
          keyExtractor={(item, i) => item.id || String(i)}
          horizontal
          pagingEnabled
          scrollEnabled={!paused}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => handleTap(e.nativeEvent.locationX)}
              style={{ width, height }}
            >
              <CapsulePage
                item={item}
                onClose={onClose}
                onOwnerPress={onOwnerPress}
                onPause={(p) => {
                  setPaused(p);
                  if (p) stopTimer();
                  else startTimer(activeIndex);
                }}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width,
    height,
  },

  // Background
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
    backgroundColor: '#f1f5f9',
  },

  // Gradients
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    zIndex: 1,
  },

  // Progress bars
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 60,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FAC638',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockedCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(250,198,56,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(250,198,56,0.3)',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  lockedDate: {
    fontSize: 14,
    color: '#FAC638',
    marginTop: 4,
    fontWeight: '600',
  },

  // Bottom
  bottomContent: {
    position: 'absolute',
    bottom: 44,
    left: 18,
    right: 18,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionCount: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  actionSpacer: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});

export default CapsuleDetailModal;
